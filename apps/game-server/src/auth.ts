// Authentication of the WebSocket upgrade: the browser's session cookie is forwarded to the web app, which is the
// only thing that understands Better Auth's cookies. Nothing about sessions is duplicated here.
import type { IncomingMessage } from 'node:http';
import type { Config } from './config.ts';

export interface AuthUser {
  id: string;
  /** Display name: display username, username or account name. */
  name: string;
}

// Same hosts the web app accepts in development (see apps/web/src/lib/server/auth.ts).
const DEV_HOST = /^(localhost|127\.0\.0\.1|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;

/** Whether a browser on this origin may open a game connection. */
export function originAllowed(origin: string | undefined, config: Pick<Config, 'origin'>): boolean {
  if (!origin) return false;
  if (config.origin) return origin === config.origin;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  return (url.protocol === 'http:' || url.protocol === 'https:') && DEV_HOST.test(url.host);
}

export type FetchLike = (url: string, init: { headers: Record<string, string> }) => Promise<Response>;

/** Resolves the account behind the request's cookie, or null. Network or web-app errors count as "no session". */
export async function sessionFromCookie(
  cookie: string | undefined,
  config: Pick<Config, 'webInternalUrl'>,
  fetchFn: FetchLike = fetch,
): Promise<AuthUser | null> {
  if (!cookie) return null;
  let res: Response;
  try {
    res = await fetchFn(`${config.webInternalUrl}/api/auth/get-session`, { headers: { cookie, accept: 'application/json' } });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return null;
  }
  const user = (body as { user?: Record<string, unknown> } | null)?.user;
  if (!user || typeof user.id !== 'string') return null;
  const name = [user.displayUsername, user.username, user.name].find((v) => typeof v === 'string' && v) as
    | string
    | undefined;
  return { id: user.id, name: name ?? 'Player' };
}

/** Full upgrade check: origin, then session. */
export async function authenticateUpgrade(
  req: IncomingMessage,
  config: Pick<Config, 'origin' | 'webInternalUrl'>,
  fetchFn?: FetchLike,
): Promise<AuthUser | null> {
  if (!originAllowed(req.headers.origin, config)) return null;
  return sessionFromCookie(req.headers.cookie, config, fetchFn);
}
