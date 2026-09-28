// Persistence of games and ratings. `PgStore` is the real one; `MemoryStore` backs the tests.
import type { Action, FinalStanding, RuleSet } from '@mahjong/engine';
import type { Format } from '@mahjong/protocol';
import { type Kysely, sql } from 'kysely';
import type { DB } from './db.ts';
import type { SeatInit } from './matchmaking.ts';

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
            userId: s.kind === 'human' ? s.userId : null,
            botSkill: s.kind === 'bot' ? s.skill : null,
            ratingBefore: s.kind === 'human' ? s.rating : null,
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
      const seats: SeatInit[] = seatRows.map((r) =>
        r.userId !== null
          ? {
              kind: 'human',
              userId: r.userId,
              name: r.displayUsername || r.username || r.name || 'Player',
              rating: r.ratingBefore ?? this.#startRating,
              games: r.games ?? 0,
            }
          : { kind: 'bot', skill: r.botSkill ?? 0.5 },
      );
      if (seats.length !== 4) continue;
      out.push({ id: g.id, format: g.format, rules: g.rules, seed: g.seed, seats, actions: actions.map((a) => a.action) });
    }
    return out;
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
}

export { sql };
