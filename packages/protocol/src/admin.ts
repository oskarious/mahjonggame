// Types of the game server's internal admin API (/internal/*), called server-side by the web app's admin page.
// Not part of the client WebSocket protocol.

/** Runtime bot settings (see apps/game-server/src/settings.ts for defaults and limits). Durations in ms. */
export interface BotSettings {
  /** Active bot players the pool keeps (missing ones are created). */
  botPoolMin: number;
  /** Upper bound for on-demand growth. */
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
  /** Multiplier for bot think times in live games. */
  thinkScale: number;
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
