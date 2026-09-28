import { env } from '$env/dynamic/private';

// Online play is only offered when the game server answers its health check. Cached briefly so the home page
// does not ping it on every request.
const TTL_MS = 10_000;
let cached: { at: number; ok: boolean } | null = null;

export function gameServerUrl(): string {
  return (env.GAME_SERVER_URL || 'http://localhost:3001').replace(/\/+$/, '');
}

export async function gameServerAvailable(): Promise<boolean> {
  const now = Date.now();
  if (cached && now - cached.at < TTL_MS) return cached.ok;
  let ok = false;
  try {
    const res = await fetch(`${gameServerUrl()}/healthz`, { signal: AbortSignal.timeout(1500) });
    ok = res.ok;
  } catch {
    ok = false;
  }
  cached = { at: now, ok };
  return ok;
}
