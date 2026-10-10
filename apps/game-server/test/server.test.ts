// The real HTTP + WebSocket layer against a stub session endpoint.
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { PROTOCOL_VERSION, type ServerMessage } from '@mahjong/protocol';
import WebSocket from 'ws';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG, type Config } from '../src/config.ts';
import { Hub } from '../src/hub.ts';
import { type GameServer, createGameServer } from '../src/server.ts';
import { MemoryStore } from '../src/store.ts';

const USERS: Record<string, { id: string; displayUsername: string }> = {
  alice: { id: 'u-alice', displayUsername: 'Alice' },
  bob: { id: 'u-bob', displayUsername: 'Bob' },
};

let web: Server;
let server: GameServer;
let config: Config;
let store: MemoryStore;
let hub: Hub;
let url: string;

beforeAll(async () => {
  // Stub of the web app: `session=<name>` cookies are valid.
  web = createServer((req, res) => {
    const m = /session=(\w+)/.exec(req.headers.cookie ?? '');
    const user = m && USERS[m[1]];
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify(user && req.url === '/api/auth/get-session' ? { session: {}, user } : null));
  });
  await new Promise<void>((r) => web.listen(0, '127.0.0.1', r));
  config = {
    ...DEFAULT_CONFIG,
    databaseUrl: 'memory',
    webInternalUrl: `http://127.0.0.1:${(web.address() as AddressInfo).port}`,
    heartbeatMs: 40,
  };
  store = new MemoryStore();
  hub = new Hub({ store, config, log: () => {} });
  server = createGameServer(hub, config);
  await new Promise<void>((r) => server.http.listen(0, '127.0.0.1', r));
  url = `ws://127.0.0.1:${(server.http.address() as AddressInfo).port}/ws`;
});

afterAll(async () => {
  await server.close();
  await new Promise<void>((r) => web.close(() => r()));
});

interface Sock {
  ws: WebSocket;
  received: ServerMessage[];
  next(type?: ServerMessage['type']): Promise<ServerMessage>;
  closed: Promise<{ code: number; reason: string }>;
}

function connect(cookie: string | null, opts: { origin?: string; autoPong?: boolean } = {}): Promise<Sock> {
  const ws = new WebSocket(url, {
    headers: { ...(cookie ? { cookie } : {}), origin: opts.origin ?? 'http://localhost:5173' },
    autoPong: opts.autoPong ?? true,
  });
  const received: ServerMessage[] = [];
  const waiters: { type?: string; resolve: (m: ServerMessage) => void }[] = [];
  ws.on('message', (d) => {
    const m = JSON.parse(d.toString()) as ServerMessage;
    const i = waiters.findIndex((w) => !w.type || w.type === m.type);
    if (i >= 0) waiters.splice(i, 1)[0].resolve(m);
    else received.push(m);
  });
  const closed = new Promise<{ code: number; reason: string }>((r) =>
    ws.on('close', (code, reason) => r({ code, reason: reason.toString() })),
  );
  const sock: Sock = {
    ws,
    received,
    closed,
    next: (type) =>
      new Promise((resolve, reject) => {
        const i = received.findIndex((m) => !type || m.type === type);
        if (i >= 0) return resolve(received.splice(i, 1)[0]);
        waiters.push({ type, resolve });
        setTimeout(() => reject(new Error(`timeout waiting for ${type ?? 'a message'}`)), 3000);
      }),
  };
  return new Promise((resolve, reject) => {
    ws.on('open', () => resolve(sock));
    ws.on('unexpected-response', (_req, res) => reject(new Error(`HTTP ${res.statusCode}`)));
    ws.on('error', reject);
  });
}

const send = (s: Sock, m: unknown) => s.ws.send(JSON.stringify(m));
const hello = (s: Sock) => send(s, { type: 'hello', version: PROTOCOL_VERSION });

describe('game server connections', () => {
  it('serves /healthz', async () => {
    const res = await fetch(url.replace('ws://', 'http://').replace('/ws', '/healthz'));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('ok');
  });

  it('refuses upgrades without a session, with a bad session, or from a foreign origin', async () => {
    await expect(connect(null)).rejects.toThrow('HTTP 401');
    await expect(connect('session=nobody')).rejects.toThrow('HTTP 401');
    await expect(connect('session=alice', { origin: 'https://evil.example' })).rejects.toThrow('HTTP 401');
    expect(hub.clients.size).toBe(0);
  });

  it('rejects anything but a matching hello first', async () => {
    const s = await connect('session=alice');
    send(s, { type: 'ping' });
    expect(await s.next()).toMatchObject({ type: 'error', code: 'badVersion' });
    expect((await s.closed).code).toBe(1008);
    const t = await connect('session=alice');
    send(t, { type: 'hello', version: PROTOCOL_VERSION + 1 });
    expect(await t.next()).toMatchObject({ type: 'error', code: 'badVersion' });
    expect((await t.closed).code).toBe(1008);
  });

  it('welcomes a signed-in player with their rating and answers pings', async () => {
    const s = await connect('session=alice');
    hello(s);
    expect(await s.next('welcome')).toEqual({
      type: 'welcome',
      user: { id: 'u-alice', name: 'Alice' },
      rating: { rating: 1000, games: 0 },
      activeGame: null,
      queued: null,
    });
    send(s, { type: 'ping' });
    expect(await s.next()).toEqual({ type: 'pong' });
    s.ws.close();
    await s.closed;
  });

  it('closes on malformed messages', async () => {
    const s = await connect('session=alice');
    hello(s);
    await s.next('welcome');
    s.ws.send('{not json');
    expect(await s.next()).toMatchObject({ type: 'error', code: 'badMessage' });
    expect((await s.closed).code).toBe(1008);
    const t = await connect('session=alice');
    hello(t);
    await t.next('welcome');
    send(t, { type: 'act', gameId: '109b066c-8093-4b99-84e8-1c948bc394a5', seq: 1, action: { type: 'nextHand' } });
    expect(await t.next()).toMatchObject({ type: 'error', code: 'badMessage' });
    expect((await t.closed).code).toBe(1008);
  });

  it('closes oversized frames', async () => {
    const s = await connect('session=alice');
    hello(s);
    await s.next('welcome');
    s.ws.send(JSON.stringify({ type: 'ping', pad: 'x'.repeat(17 * 1024) }));
    expect((await s.closed).code).toBe(1009);
  });

  it('rate-limits a flood', async () => {
    const s = await connect('session=alice');
    hello(s);
    await s.next('welcome');
    for (let i = 0; i < 60; i++) send(s, { type: 'ping' });
    expect(await s.next('error')).toMatchObject({ type: 'error', code: 'rateLimited' });
    expect((await s.closed).code).toBe(1008);
  });

  it('a second connection of the same user takes over the first', async () => {
    const a = await connect('session=alice');
    hello(a);
    await a.next('welcome');
    const b = await connect('session=alice');
    hello(b);
    await b.next('welcome');
    expect(await a.next()).toEqual({ type: 'takenOver' });
    expect((await a.closed).code).toBe(4000);
    expect(hub.clients.size).toBe(1);
    send(b, { type: 'ping' });
    expect(await b.next()).toEqual({ type: 'pong' });
    b.ws.close();
    await b.closed;
    await vi.waitFor(() => expect(hub.clients.size).toBe(0));
  });

  it('drops a connection that stops answering pings', async () => {
    const s = await connect('session=bob', { autoPong: false });
    hello(s);
    await s.next('welcome');
    const t0 = Date.now();
    const { code } = await s.closed;
    expect(code).toBe(1006);
    expect(Date.now() - t0).toBeGreaterThanOrEqual(80);
    expect(Date.now() - t0).toBeLessThan(1000);
  });
});
