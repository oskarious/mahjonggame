// Kysely instance and the table types this server uses. The schema is owned by apps/web (migrations there); keep
// these in sync with apps/web/src/lib/server/schema.ts. The server refuses to start until the migration it needs
// has been applied. Ids are Postgres `uuid` columns, read and written as strings.
import type { Action, FinalStanding, RuleSet } from '@mahjong/engine';
import type { ExerciseOf } from '@mahjong/drills/types';
import type { BotSchedule } from '@mahjong/protocol';
import { type ColumnType, type Generated, type JSONColumnType, Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';

type Timestamp = ColumnType<Date, Date | string | undefined, Date | string>;

export interface UserTable {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  username: string | null;
  displayUsername: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  role: ColumnType<string, string | undefined, string>;
}

export interface RatingTable {
  userId: string;
  rating: number;
  games: number;
  updatedAt: Timestamp;
}

export interface GameTable {
  id: string;
  format: 'east' | 'south';
  rules: JSONColumnType<RuleSet>;
  seed: string;
  /** `ENGINE_VERSION` the game was created under; recovery aborts other versions. */
  engineVersion: number;
  /** 'aborted': could not be resumed (another engine version, or its log no longer replays); unrated. */
  status: 'running' | 'finished' | 'aborted';
  createdAt: Timestamp;
  endedAt: Timestamp | null;
  final: JSONColumnType<FinalStanding[]> | null;
}

export interface GameSeatTable {
  gameId: string;
  seat: number;
  userId: string | null;
  botSkill: number | null;
  ratingBefore: number | null;
  ratingAfter: number | null;
  placement: number | null;
  points: number | null;
}

export interface GameActionTable {
  gameId: string;
  seq: number;
  action: JSONColumnType<Action>;
  at: Timestamp;
}

export interface BotTable {
  userId: string;
  skill: number;
  active: ColumnType<boolean, boolean | undefined, boolean>;
  createdAt: Timestamp;
  /** Null until this server generates one (on load or creation). */
  schedule: ColumnType<BotSchedule | null, string | null | undefined, string | null>;
}

export interface SettingTable {
  key: string;
  value: JSONColumnType<object>;
  updatedAt: Timestamp;
}

export interface DailyDiscardTable {
  date: string;
  exercise: JSONColumnType<ExerciseOf<'discard'>>;
  botShare: number;
  createdAt: Timestamp;
}

export interface DailyDiscardVoteTable {
  id: Generated<string>;
  date: string;
  userId: string | null;
  guestId: string | null;
  kind: number;
  createdAt: Timestamp;
}

export interface MigrationTable {
  name: string;
  timestamp: string;
}

export interface DB {
  user: UserTable;
  rating: RatingTable;
  game: GameTable;
  game_seat: GameSeatTable;
  game_action: GameActionTable;
  bot: BotTable;
  setting: SettingTable;
  daily_discard: DailyDiscardTable;
  daily_discard_vote: DailyDiscardVoteTable;
  kysely_migration: MigrationTable;
}

/** The latest migration (in apps/web/migrations) this server needs: it adds the last of the columns above. */
export const REQUIRED_MIGRATION = '0008_engine_version';

export function createDb(connectionString: string): Kysely<DB> {
  const pool = new pg.Pool({ connectionString, max: 10 });
  return new Kysely<DB>({ dialect: new PostgresDialect({ pool }) });
}

/** Throws unless the web app has applied the migration this server depends on. */
export async function checkMigration(db: Kysely<DB>): Promise<void> {
  let applied: boolean;
  try {
    const row = await db
      .selectFrom('kysely_migration')
      .select('name')
      .where('name', '=', REQUIRED_MIGRATION)
      .executeTakeFirst();
    applied = !!row;
  } catch (e) {
    throw new Error(`Cannot read kysely_migration (has the web app run its migrations?)`, { cause: e });
  }
  if (!applied) throw new Error(`Migration ${REQUIRED_MIGRATION} is not applied; start the web app first`);
}
