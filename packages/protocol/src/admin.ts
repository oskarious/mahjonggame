// Types of the game server's internal admin API (/internal/*), called server-side by the web app's admin page.
// Not part of the client WebSocket protocol.

/** Runtime bot settings (see apps/game-server/src/settings.ts for defaults and limits). Durations in ms. */
export interface BotSettings {
  /** Active bot players the pool keeps (missing ones are created). Retired bots do not count. */
  botPoolMin: number;
  /** Most active bot players: on-demand growth, admin creation and reactivation stop here. */
  botPoolMax: number;
  /** A background game only starts if at least this many idle bots remain for humans. */
  idleReserve: number;
  backgroundEnabled: boolean;
  /** Mean interval between background game starts (±50 % jitter). */
  backgroundEveryMs: number;
  /** Interval while the pool is new (warm-up). */
  warmupEveryMs: number;
  /** Concurrent warm-up games (they run without delays). */
  warmupTables: number;
  /** A waiting human gets bot players after this long (random in range). */
  summonAfterMs: [number, number];
  /** Gap between bot players joining for the same human. */
  botArrivalMs: [number, number];
  /** A new bot is created for a human who has found no fitting idle bot for this long. */
  growAfterMs: number;
  /** Rest after a game before a bot is picked again. */
  botRestMs: [number, number];
  /** Multiplier for every bot delay in live games (think, join, ready). */
  thinkScale: number;
  /** Think time when only one move is possible (random in range). */
  thinkForcedMs: [number, number];
  /** Think time for a call decision (pon/chii/ron or pass; random in range). */
  thinkCallMs: [number, number];
  /** Median think time on an own turn, plus `thinkPerTileMs` for every distinct tile kind it could discard. */
  thinkTurnMs: number;
  thinkPerTileMs: number;
  /** Median multiplier when the turn offers riichi, kan, tsumo or an abortive draw. */
  thinkSpecialScale: number;
  /** Median multiplier for the dealer's first decision of a hand. */
  thinkOpeningScale: number;
  /** Chance in percent, per own turn with a choice, of a long think into the time bank. */
  longThinkPercent: number;
  /** Time for a bot to join a new game: median and floor (capped by the server's JOIN_MAX_MS). */
  joinMedianMs: number;
  joinMinMs: number;
  /** Time for a bot to confirm a hand result: median and floor (capped by the server's READY_MS). */
  readyMedianMs: number;
  readyMinMs: number;
  /** Chance in percent of a slow confirm, drawn from `readySlowFromMs` up to READY_MS. */
  readySlowPercent: number;
  readySlowFromMs: number;
  /** Chance in percent, per decision, that a bot player lets its timer run out in a game with humans. */
  timeoutPercent: number;
}

export type AdminBotState = 'idle' | 'resting' | 'queued' | 'busy' | 'retired';

export interface AdminBot {
  id: string;
  name: string;
  skill: number;
  active: boolean;
  rating: number;
  games: number;
  state: AdminBotState;
  roomId: string | null;
  forUserId: string | null;
}

export interface AdminPoolSnapshot {
  settings: BotSettings;
  /** False when background games are disabled by the environment (BOTS=off). */
  backgroundAllowed: boolean;
  warmingUp: boolean;
  counts: { active: number; retired: number; idle: number; resting: number; queued: number; busy: number };
  /** Last time a bot was created on demand because nobody fitted a waiting human (ms epoch), or null. */
  lastGrownAt: number | null;
  bots: AdminBot[];
  live: { rooms: number; humanRooms: number; humansQueued: number };
}

/** POST /internal/bots: `count` bots spread over a rating range, or one bot with an optional name and skill. */
export type AdminCreateBots = { count: number; minRating: number; maxRating: number } | { name?: string; skill?: number };

/** PATCH /internal/bots/:id */
export interface AdminBotPatch {
  name?: string;
  skill?: number;
  active?: boolean;
}
