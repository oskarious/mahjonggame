// Persistence of games and ratings. `PgStore` is the real one; `MemoryStore` backs the tests.
import type { Action, FinalStanding, RuleSet } from '@mahjong/engine';
import type { Format } from '@mahjong/protocol';
import { randomUUID } from 'node:crypto';
import { type Kysely, sql } from 'kysely';
import type { DB } from './db.ts';
import { anonymousBot, type SeatInit } from './matchmaking.ts';

export interface RatingRow {
  rating: number;
  games: number;
}

export interface GameRecord {
  id: string;
  format: Format;
  rules: RuleSet;
  seed: string;
  seats: SeatInit[];
}

export interface SeatResult {
  seat: number;
  placement: number;
  points: number;
  ratingAfter: number | null;
}

export interface RatingUpdate {
  userId: string;
  rating: number;
  games: number;
}

/** A bot player as stored: a user without a credential account, a `bot` row and a rating. */
export interface BotRow {
  id: string;
  /** Display name (also the username, lowercased). */
  name: string;
  skill: number;
  active: boolean;
  rating: number;
  games: number;
}

export interface BotPatch {
  name?: string;
  skill?: number;
  active?: boolean;
}

export type BotUpdateResult = 'ok' | 'nameTaken' | 'notFound';

export interface StoredGame extends GameRecord {
  actions: Action[];
}

export interface Store {
  getRating(userId: string): Promise<RatingRow>;
  createGame(game: GameRecord): Promise<void>;
  /** `seq` is the state's sequence number before the action was applied. */
  appendAction(gameId: string, seq: number, action: Action): Promise<void>;
  /** Result, seat placements and rating updates, atomically. */
  finishGame(gameId: string, final: FinalStanding[], seats: SeatResult[], ratings: RatingUpdate[]): Promise<void>;
  /** Unfinished games with their action logs, for recovery on startup. */
  loadRunningGames(): Promise<StoredGame[]>;
  /** Every bot player, active or retired. */
  loadBots(): Promise<BotRow[]>;
  /** Creates a bot player (user, bot and rating rows). Null if the name is taken. */
  createBot(bot: { name: string; skill: number; rating: number }): Promise<BotRow | null>;
  updateBot(id: string, patch: BotPatch): Promise<BotUpdateResult>;
  /** A runtime setting (JSON), or null if never saved. */
  loadSetting(key: string): Promise<unknown>;
  saveSetting(key: string, value: unknown): Promise<void>;
}

export class PgStore implements Store {
  #db: Kysely<DB>;
  #startRating: number;

  constructor(db: Kysely<DB>, startRating = 1000) {
    this.#db = db;
    this.#startRating = startRating;
  }

  async getRating(userId: string): Promise<RatingRow> {
    const r = await this.#db
      .selectFrom('rating')
      .select(['rating', 'games'])
      .where('userId', '=', userId)
      .executeTakeFirst();
    return r ?? { rating: this.#startRating, games: 0 };
  }

  async createGame(game: GameRecord): Promise<void> {
    await this.#db.transaction().execute(async (trx) => {
      await trx
        .insertInto('game')
        .values({ id: game.id, format: game.format, rules: JSON.stringify(game.rules), seed: game.seed, status: 'running' })
        .execute();
      await trx
        .insertInto('game_seat')
        .values(
          game.seats.map((s, seat) => ({
            gameId: game.id,
            seat,
            userId: s.userId,
            botSkill: s.kind === 'bot' ? s.skill : null,
            ratingBefore: s.userId !== null ? s.rating : null,
          })),
        )
        .execute();
    });
  }

  async appendAction(gameId: string, seq: number, action: Action): Promise<void> {
    await this.#db.insertInto('game_action').values({ gameId, seq, action: JSON.stringify(action) }).execute();
  }

  async finishGame(gameId: string, final: FinalStanding[], seats: SeatResult[], ratings: RatingUpdate[]): Promise<void> {
    await this.#db.transaction().execute(async (trx) => {
      await trx
        .updateTable('game')
        .set({ status: 'finished', endedAt: new Date(), final: JSON.stringify(final) })
        .where('id', '=', gameId)
        .execute();
      for (const s of seats) {
        await trx
          .updateTable('game_seat')
          .set({ placement: s.placement, points: s.points, ratingAfter: s.ratingAfter })
          .where('gameId', '=', gameId)
          .where('seat', '=', s.seat)
          .execute();
      }
      for (const r of ratings) {
        await trx
          .insertInto('rating')
          .values({ userId: r.userId, rating: r.rating, games: r.games, updatedAt: new Date() })
          .onConflict((oc) => oc.column('userId').doUpdateSet({ rating: r.rating, games: r.games, updatedAt: new Date() }))
          .execute();
      }
    });
  }

  async loadRunningGames(): Promise<StoredGame[]> {
    const games = await this.#db.selectFrom('game').selectAll().where('status', '=', 'running').execute();
    const out: StoredGame[] = [];
    for (const g of games) {
      const seatRows = await this.#db
        .selectFrom('game_seat')
        .leftJoin('user', 'user.id', 'game_seat.userId')
        .leftJoin('rating', 'rating.userId', 'game_seat.userId')
        .select([
          'game_seat.seat',
          'game_seat.userId',
          'game_seat.botSkill',
          'game_seat.ratingBefore',
          'user.name',
          'user.username',
          'user.displayUsername',
          'rating.games',
        ])
        .where('game_seat.gameId', '=', g.id)
        .orderBy('game_seat.seat')
        .execute();
      const actions = await this.#db
        .selectFrom('game_action')
        .select('action')
        .where('gameId', '=', g.id)
        .orderBy('seq')
        .execute();
      const seats: SeatInit[] = seatRows.map((r) => {
        if (r.userId === null) return anonymousBot(r.botSkill ?? 0.5);
        const player = {
          userId: r.userId,
          name: r.displayUsername || r.username || r.name || 'Player',
          rating: r.ratingBefore ?? this.#startRating,
          games: r.games ?? 0,
        };
        return r.botSkill !== null ? { kind: 'bot', skill: r.botSkill, ...player } : { kind: 'human', ...player };
      });
      if (seats.length !== 4) continue;
      out.push({ id: g.id, format: g.format, rules: g.rules, seed: g.seed, seats, actions: actions.map((a) => a.action) });
    }
    return out;
  }

  async loadBots(): Promise<BotRow[]> {
    const rows = await this.#db
      .selectFrom('bot')
      .innerJoin('user', 'user.id', 'bot.userId')
      .leftJoin('rating', 'rating.userId', 'bot.userId')
      .select(['bot.userId', 'bot.skill', 'bot.active', 'user.displayUsername', 'user.name', 'rating.rating', 'rating.games'])
      .execute();
    return rows.map((r) => ({
      id: r.userId,
      name: r.displayUsername || r.name,
      skill: r.skill,
      active: r.active,
      rating: r.rating ?? this.#startRating,
      games: r.games ?? 0,
    }));
  }

  async createBot(bot: { name: string; skill: number; rating: number }): Promise<BotRow | null> {
    const id = randomUUID();
    return this.#db.transaction().execute(async (trx) => {
      // No `account` row: without a credential, Better Auth cannot sign this user in.
      const res = await trx
        .insertInto('user')
        .values({
          id,
          name: bot.name,
          email: `${id}@bot.invalid`,
          emailVerified: false,
          username: bot.name.toLowerCase(),
          displayUsername: bot.name,
        })
        .onConflict((oc) => oc.doNothing())
        .executeTakeFirst();
      if (!res.numInsertedOrUpdatedRows) return null;
      await trx.insertInto('bot').values({ userId: id, skill: bot.skill }).execute();
      await trx.insertInto('rating').values({ userId: id, rating: bot.rating, games: 0, updatedAt: new Date() }).execute();
      return { id, name: bot.name, skill: bot.skill, active: true, rating: bot.rating, games: 0 };
    });
  }

  async updateBot(id: string, patch: BotPatch): Promise<BotUpdateResult> {
    try {
      return await this.#db.transaction().execute(async (trx) => {
        const exists = await trx.selectFrom('bot').select('userId').where('userId', '=', id).executeTakeFirst();
        if (!exists) return 'notFound';
        if (patch.skill !== undefined || patch.active !== undefined) {
          await trx
            .updateTable('bot')
            .set({ ...(patch.skill !== undefined && { skill: patch.skill }), ...(patch.active !== undefined && { active: patch.active }) })
            .where('userId', '=', id)
            .execute();
        }
        if (patch.name !== undefined) {
          await trx
            .updateTable('user')
            .set({ name: patch.name, username: patch.name.toLowerCase(), displayUsername: patch.name, updatedAt: new Date() })
            .where('id', '=', id)
            .execute();
        }
        return 'ok';
      });
    } catch (e) {
      if ((e as { code?: string }).code === '23505') return 'nameTaken'; // unique_violation on user.username
      throw e;
    }
  }

  async loadSetting(key: string): Promise<unknown> {
    const r = await this.#db.selectFrom('setting').select('value').where('key', '=', key).executeTakeFirst();
    return r ? r.value : null;
  }

  async saveSetting(key: string, value: unknown): Promise<void> {
    const json = JSON.stringify(value);
    await this.#db
      .insertInto('setting')
      .values({ key, value: json, updatedAt: new Date() })
      .onConflict((oc) => oc.column('key').doUpdateSet({ value: json, updatedAt: new Date() }))
      .execute();
  }
}

/** In-memory store for tests; records the same things in plain objects. */
export class MemoryStore implements Store {
  ratings = new Map<string, RatingRow>();
  games = new Map<string, StoredGame & { status: 'running' | 'finished'; final: FinalStanding[] | null; results: SeatResult[] }>();
  /** Every appended action in order, across games (for assertions on persist-before-send). */
  log: { gameId: string; seq: number; action: Action }[] = [];
  /** Optional hook to delay or fail writes in tests. */
  beforeWrite: (() => Promise<void>) | null = null;

  async getRating(userId: string): Promise<RatingRow> {
    return this.ratings.get(userId) ?? { rating: 1000, games: 0 };
  }

  async createGame(game: GameRecord): Promise<void> {
    await this.beforeWrite?.();
    this.games.set(game.id, { ...game, actions: [], status: 'running', final: null, results: [] });
  }

  async appendAction(gameId: string, seq: number, action: Action): Promise<void> {
    await this.beforeWrite?.();
    const g = this.games.get(gameId);
    if (!g) throw new Error(`No game ${gameId}`);
    if (g.actions.length !== seq) throw new Error(`Out-of-order action: expected seq ${g.actions.length}, got ${seq}`);
    g.actions.push(action);
    this.log.push({ gameId, seq, action });
  }

  async finishGame(gameId: string, final: FinalStanding[], seats: SeatResult[], ratings: RatingUpdate[]): Promise<void> {
    await this.beforeWrite?.();
    const g = this.games.get(gameId);
    if (!g) throw new Error(`No game ${gameId}`);
    g.status = 'finished';
    g.final = final;
    g.results = seats;
    for (const r of ratings) this.ratings.set(r.userId, { rating: r.rating, games: r.games });
  }

  async loadRunningGames(): Promise<StoredGame[]> {
    return [...this.games.values()]
      .filter((g) => g.status === 'running')
      .map((g) => ({ id: g.id, format: g.format, rules: g.rules, seed: g.seed, seats: g.seats, actions: [...g.actions] }));
  }

  /** Bot players by id; ratings live in `ratings` like everyone's. */
  bots = new Map<string, { id: string; name: string; skill: number; active: boolean }>();
  /** Lowercased usernames in use (bots add theirs; tests may add humans'). */
  usernames = new Set<string>();
  settings = new Map<string, unknown>();
  #nextBot = 1;

  async loadBots(): Promise<BotRow[]> {
    return [...this.bots.values()].map((b) => ({ ...b, ...(this.ratings.get(b.id) ?? { rating: 1000, games: 0 }) }));
  }

  async createBot(bot: { name: string; skill: number; rating: number }): Promise<BotRow | null> {
    await this.beforeWrite?.();
    if (this.usernames.has(bot.name.toLowerCase())) return null;
    const id = `bot-${this.#nextBot++}`;
    this.usernames.add(bot.name.toLowerCase());
    this.bots.set(id, { id, name: bot.name, skill: bot.skill, active: true });
    this.ratings.set(id, { rating: bot.rating, games: 0 });
    return { id, name: bot.name, skill: bot.skill, active: true, rating: bot.rating, games: 0 };
  }

  async updateBot(id: string, patch: BotPatch): Promise<BotUpdateResult> {
    await this.beforeWrite?.();
    const b = this.bots.get(id);
    if (!b) return 'notFound';
    if (patch.name !== undefined && patch.name.toLowerCase() !== b.name.toLowerCase()) {
      if (this.usernames.has(patch.name.toLowerCase())) return 'nameTaken';
      this.usernames.delete(b.name.toLowerCase());
      this.usernames.add(patch.name.toLowerCase());
    }
    Object.assign(b, patch);
    return 'ok';
  }

  async loadSetting(key: string): Promise<unknown> {
    return this.settings.has(key) ? structuredClone(this.settings.get(key)) : null;
  }

  async saveSetting(key: string, value: unknown): Promise<void> {
    await this.beforeWrite?.();
    this.settings.set(key, structuredClone(value));
  }
}

export { sql };
