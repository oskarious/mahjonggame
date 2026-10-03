import type { ColumnType, Generated, Insertable, JSONColumnType, Selectable } from 'kysely';
import type { Action, FinalStanding, RuleSet } from '@mahjong/engine';
import type { BotSchedule } from '@mahjong/protocol';

// Table types for Kysely. Keep in sync with migrations/ (auth tables are written by Better Auth; we mostly read them).
type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;

export interface UserTable {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  /** Lowercased, unique. */
  username: string | null;
  /** As the user typed it; show this one. */
  displayUsername: string | null;
  /** `user` or `admin`; only ever set directly in the database. */
  role: ColumnType<string, string | undefined, string>;
}

export interface SessionTable {
  id: string;
  expiresAt: Timestamp;
  token: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  ipAddress: string | null;
  userAgent: string | null;
  userId: string;
}

export interface AccountTable {
  id: string;
  accountId: string;
  providerId: string;
  userId: string;
  accessToken: string | null;
  refreshToken: string | null;
  idToken: string | null;
  accessTokenExpiresAt: Timestamp | null;
  refreshTokenExpiresAt: Timestamp | null;
  scope: string | null;
  /** Password hash, never the password. */
  password: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface VerificationTable {
  id: string;
  identifier: string;
  value: string;
  expiresAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// --- Online play (migration 0002_game_server). Written by apps/game-server, which keeps its own copy of these types.

export interface RatingTable {
  userId: string;
  rating: number;
  /** Rated games played. */
  games: number;
  updatedAt: Timestamp;
}

export interface GameTable {
  id: string;
  format: 'east' | 'south';
  rules: JSONColumnType<RuleSet>;
  seed: string;
  /** 'aborted': could not be resumed (e.g. its log no longer replays after an engine change); unrated. */
  status: 'running' | 'finished' | 'aborted';
  createdAt: Timestamp;
  endedAt: Timestamp | null;
  final: JSONColumnType<FinalStanding[]> | null;
}

export interface GameSeatTable {
  gameId: string;
  seat: number;
  /** Null for deleted accounts and anonymous bots of games from before bot players. */
  userId: string | null;
  /** Set for bot seats (bot players and anonymous bots). */
  botSkill: number | null;
  ratingBefore: number | null;
  ratingAfter: number | null;
  placement: number | null;
  points: number | null;
}

export interface GameActionTable {
  gameId: string;
  /** Sequence number the action was applied at (GameState.seq before applying). */
  seq: number;
  action: JSONColumnType<Action>;
  at: Timestamp;
}

// --- Bot players and settings (migration 0003_bot_players). Bot users are `user` rows without an account.

export interface BotTable {
  userId: string;
  skill: number;
  active: ColumnType<boolean, boolean | undefined, boolean>;
  createdAt: Timestamp;
  /** Time zone, free-time windows and appetite (migration 0004_bot_schedules); null until the game server sets it. */
  schedule: ColumnType<BotSchedule | null, string | null | undefined, string | null>;
}

export interface SettingTable {
  key: string;
  value: JSONColumnType<object>;
  updatedAt: Timestamp;
}

export interface DB {
  user: UserTable;
  session: SessionTable;
  account: AccountTable;
  verification: VerificationTable;
  rating: RatingTable;
  game: GameTable;
  game_seat: GameSeatTable;
  game_action: GameActionTable;
  bot: BotTable;
  setting: SettingTable;
}

export type User = Selectable<UserTable>;
export type NewUser = Insertable<UserTable>;
// `Generated` is re-exported for future tables with serial/default ids.
export type { Generated };
