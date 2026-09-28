// The internal admin API (/internal/*), used by the web app's admin page from the server side. Bearer-token
// protected; in production only /ws is routed to this server, so /internal is not reachable from outside anyway.
import { createHash, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { CreateBotsRequest } from './bots.ts';
import type { Config } from './config.ts';
import type { Hub } from './hub.ts';

const MAX_BODY_BYTES = 64 * 1024;

/** Constant-time comparison of the presented bearer token with the configured one. */
export function tokenMatches(header: string | undefined, token: string): boolean {
  const m = /^Bearer (.+)$/.exec(header ?? '');
  if (!m) return false;
  const digest = (s: string) => createHash('sha256').update(s).digest();
  return timingSafeEqual(digest(m[1]), digest(token));
}

function send(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('tooLarge'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {});
      } catch {
        reject(new Error('badJson'));
      }
    });
    req.on('error', reject);
  });
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Handles a request under /internal/. */
export async function handleInternal(req: IncomingMessage, res: ServerResponse, hub: Hub, config: Pick<Config, 'internalToken'>): Promise<void> {
  if (!config.internalToken) return send(res, 404, { error: 'Not found' });
  if (!tokenMatches(req.headers.authorization, config.internalToken)) return send(res, 401, { error: 'Unauthorized' });
  const path = (req.url ?? '').split('?')[0];
  const method = req.method ?? 'GET';
  let body: unknown = null;
  if (method !== 'GET') {
    try {
      body = await readJson(req);
    } catch (e) {
      return send(res, (e as Error).message === 'tooLarge' ? 413 : 400, { error: 'Bad request body' });
    }
    if (!isObj(body)) return send(res, 400, { error: 'Expected a JSON object' });
  }

  if (path === '/internal/bots' && method === 'GET') {
    const rooms = [...hub.rooms.values()];
    const humansQueued = [...hub.matchmaker.queued()].filter((q) => !q.entry.bot).length;
    return send(res, 200, {
      ...hub.bots.snapshot(),
      live: { rooms: rooms.length, humanRooms: rooms.filter((r) => r.hasHumans).length, humansQueued },
    });
  }
  if (path === '/internal/bots' && method === 'POST') {
    const r = await hub.bots.createBots(body as CreateBotsRequest);
    return send(res, 'error' in r ? 400 : 200, r);
  }
  const bot = /^\/internal\/bots\/([^/]+)$/.exec(path);
  if (bot && method === 'PATCH') {
    const r = await hub.bots.updateBot(decodeURIComponent(bot[1]), body as Record<string, never>);
    return send(res, 'error' in r ? (r.error === 'No such bot' ? 404 : 400) : 200, r);
  }
  if (path === '/internal/settings' && method === 'PUT') {
    const r = await hub.bots.updateSettings(body);
    return send(res, 'error' in r ? 400 : 200, r);
  }
  send(res, 404, { error: 'Not found' });
}
