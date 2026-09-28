// Runtime configuration from the environment, with the defaults from the design.

export interface Config {
  port: number;
  databaseUrl: string;
  /** Public origin (https://host). Null in development: localhost and private-LAN origins are accepted. */
  origin: string | null;
  /** Where the web app answers /api/auth/get-session for this server. */
  webInternalUrl: string;
  /** Base thinking time for an own turn / a call response, ms. */
  turnMs: number;
  callMs: number;
  /** Time bank per player, reset at the start of every hand, ms. */
  bankMs: number;
  /** Bots act after a random delay in this range, ms. */
  botDelayMs: [number, number];
  /** Wait for `ready` between hands at most this long, ms. */
  readyMs: number;
  /** A disconnected seat is played by a bot after this, ms. */
  graceMs: number;
  /** A game with no human connected for this long is finished by bots, ms. */
  abandonMs: number;
  /** Matchmaking: fill with bots after this, ms. */
  fillDelayMs: number;
  /** Matchmaking: acceptable rating gap = windowBase + windowPerSecond × seconds waited, up to windowMax. */
  windowBase: number;
  windowPerSecond: number;
  windowMax: number;
  /** Hint level by rating: below `waits` → waits, below `distance` → distance, otherwise off. */
  hintThresholds: { waits: number; distance: number };
  /** Heartbeat ping interval, ms; two missed pongs close the connection. */
  heartbeatMs: number;
  /** Rating K factor: `kNew` for the first `newGames` rated games, then `k`. */
  kNew: number;
  k: number;
  newGames: number;
  startRating: number;
}

export const DEFAULT_CONFIG: Config = {
  port: 3001,
  databaseUrl: '',
  origin: null,
  webInternalUrl: 'http://localhost:5173',
  turnMs: 8_000,
  callMs: 5_000,
  bankMs: 15_000,
  botDelayMs: [400, 900],
  readyMs: 12_000,
  graceMs: 10_000,
  abandonMs: 5 * 60_000,
  fillDelayMs: 15_000,
  windowBase: 150,
  windowPerSecond: 20,
  windowMax: 800,
  hintThresholds: { waits: 1100, distance: 1300 },
  heartbeatMs: 20_000,
  kNew: 40,
  k: 20,
  newGames: 20,
  startRating: 1000,
};

export function configFromEnv(env: Record<string, string | undefined> = process.env): Config {
  const num = (name: string, fallback: number) => {
    const v = env[name];
    if (v === undefined || v === '') return fallback;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) throw new Error(`${name} must be a non-negative number, got "${v}"`);
    return n;
  };
  const d = DEFAULT_CONFIG;
  if (!env.DATABASE_URL) throw new Error('Set DATABASE_URL');
  if (env.NODE_ENV === 'production' && !env.ORIGIN) throw new Error('Set ORIGIN in production');
  return {
    ...d,
    port: num('PORT', d.port),
    databaseUrl: env.DATABASE_URL,
    origin: env.ORIGIN ? env.ORIGIN.replace(/\/+$/, '') : null,
    webInternalUrl: (env.WEB_INTERNAL_URL || d.webInternalUrl).replace(/\/+$/, ''),
    turnMs: num('TURN_MS', d.turnMs),
    callMs: num('CALL_MS', d.callMs),
    bankMs: num('BANK_MS', d.bankMs),
    readyMs: num('READY_MS', d.readyMs),
    graceMs: num('GRACE_MS', d.graceMs),
    abandonMs: num('ABANDON_MS', d.abandonMs),
    fillDelayMs: num('FILL_DELAY_MS', d.fillDelayMs),
  };
}
