import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { gameServerUrl } from './game-server';

/** The admin pages look like any missing page to everyone but admins (role set by hand in the database). */
export function requireAdmin(locals: App.Locals): void {
  if (locals.user?.role !== 'admin') error(404, 'Not Found');
}

export type InternalResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string };

/** Calls the game server's internal admin API with the shared token. Never throws. */
export async function internalApi<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT',
  path: string,
  body?: unknown,
): Promise<InternalResult<T>> {
  const token = env.INTERNAL_TOKEN;
  if (!token) return { ok: false, status: 503, error: 'INTERNAL_TOKEN is not set for the web app' };
  let res: Response;
  try {
    res = await fetch(`${gameServerUrl()}/internal${path}`, {
      method,
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { ok: false, status: 0, error: 'Game server unreachable' };
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // Non-JSON (e.g. a proxy error page).
  }
  if (res.ok) return { ok: true, data: data as T };
  const message = (data as { error?: string } | null)?.error;
  return {
    ok: false,
    status: res.status,
    error: message ?? (res.status === 404 ? 'Admin API disabled on the game server' : `HTTP ${res.status}`),
  };
}
