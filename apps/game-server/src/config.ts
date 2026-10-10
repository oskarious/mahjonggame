// Configuration from the environment, with the defaults from the design. Bot pool knobs that admins tune at runtime
// are not here: see settings.ts.

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
  /** Base time for the dealer's first decision of a hand (before anyone has discarded), ms. */
  openingTurnMs: number;
  /** Countdown before play after the game's first deal / after every later deal, ms. Nobody can act meanwhile. */
  startCountdownMs: number;
  handCountdownMs: number;
  /** A new game waits at most this long for every seat to join (bots join after a random delay), ms; 0 = no wait. */
  joinMaxMs: number;
  /** Time bank per player, reset at the start of every hand, ms. */
  bankMs: number;
  /** Wait for `ready` (connected humans and bot players) between hands at most this long, ms. */
  readyMs: number;
  /** A disconnected seat is played by a bot after this, ms. */
  graceMs: number;
  /** A game with no human connected for this long is finished by bots, ms. */
  abandonMs: number;
  /** Matchmaking: acceptable rating gap = windowBase + windowPerSecond × seconds waited, up to windowMax. */
  windowBase: number;
  windowPerSecond: number;
  windowMax: number;
  /** Hint level by rating: below `distance` → distance, otherwise off. Waits are always shown. */
  hintThresholds: { distance: number };
  /** Heartbeat ping interval, ms; two missed pongs close the connection. */
  heartbeatMs: number;
  /** Rating K factor: `kNew` for the first `newGames` rated games, then `k`. */
  kNew: number;
  k: number;
  newGames: number;
  startRating: number;
  /** Background games of bot players (env BOTS=off disables them; summoning for humans always runs). */
  botsBackground: boolean;
  /** Bearer token for the /internal admin API; null disables the API. */
  internalToken: string | null;
}

export const DEFAULT_CONFIG: Config = {
  port: 3001,
  databaseUrl: '',
  origin: null,
  webInternalUrl: 'http://localhost:5173',
  turnMs: 5_000,
  callMs: 5_000,
  openingTurnMs: 10_000,
  startCountdownMs: 5_000,
  handCountdownMs: 3_000,
  joinMaxMs: 10_000,
  bankMs: 20_000,
  readyMs: 12_000,
  graceMs: 10_000,
  abandonMs: 5 * 60_000,
  windowBase: 150,
  windowPerSecond: 20,
  windowMax: 800,
  hintThresholds: { distance: 1300 },
  heartbeatMs: 20_000,
  kNew: 40,
  k: 20,
  newGames: 20,
  startRating: 1000,
  botsBackground: true,
  internalToken: null,
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
  if (env.INTERNAL_TOKEN && env.INTERNAL_TOKEN.length < 32)
    throw new Error('INTERNAL_TOKEN must be at least 32 characters');
  return {
    ...d,
    port: num('PORT', d.port),
    databaseUrl: env.DATABASE_URL,
    origin: env.ORIGIN ? env.ORIGIN.replace(/\/+$/, '') : null,
    webInternalUrl: (env.WEB_INTERNAL_URL || d.webInternalUrl).replace(/\/+$/, ''),
    turnMs: num('TURN_MS', d.turnMs),
    callMs: num('CALL_MS', d.callMs),
    openingTurnMs: num('OPENING_TURN_MS', d.openingTurnMs),
    startCountdownMs: num('START_COUNTDOWN_MS', d.startCountdownMs),
    handCountdownMs: num('HAND_COUNTDOWN_MS', d.handCountdownMs),
    joinMaxMs: num('JOIN_MAX_MS', d.joinMaxMs),
    bankMs: num('BANK_MS', d.bankMs),
    readyMs: num('READY_MS', d.readyMs),
    graceMs: num('GRACE_MS', d.graceMs),
    abandonMs: num('ABANDON_MS', d.abandonMs),
    botsBackground: env.BOTS !== 'off',
    internalToken: env.INTERNAL_TOKEN || null,
  };
}
