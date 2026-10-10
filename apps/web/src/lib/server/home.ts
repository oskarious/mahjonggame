// The home page's sections that read the game tables: who is playing now, and a signed-in player's week and last
// games. Bot players count like everyone else (they are designed to: roadmap.md).
import { sql } from 'kysely';
import { db } from './db';

/** Players (bot players included) seated in running games. */
export async function playingNow(): Promise<number> {
  const r = await db
    .selectFrom('game')
    .innerJoin('game_seat', 'game_seat.gameId', 'game.id')
    .where('game.status', '=', 'running')
    .select(sql<number>`count(distinct game_seat."userId")::int`.as('players'))
    .executeTakeFirst();
  return r?.players ?? 0;
}

export interface Week {
  games: number;
  /** Rating change over the last seven days. */
  change: number;
}

export async function week(userId: string): Promise<Week> {
  const r = await db
    .selectFrom('game_seat')
    .innerJoin('game', 'game.id', 'game_seat.gameId')
    .where('game_seat.userId', '=', userId)
    .where('game.status', '=', 'finished')
    .where('game.endedAt', '>=', sql<Date>`now() - interval '7 days'`)
    .select([
      sql<number>`count(*)::int`.as('games'),
      sql<number>`coalesce(sum("ratingAfter" - "ratingBefore"), 0)::int`.as('change'),
    ])
    .executeTakeFirst();
  return { games: r?.games ?? 0, change: r?.change ?? 0 };
}

export interface RecentGame {
  id: string;
  format: 'east' | 'south';
  endedAt: string;
  placement: number | null;
  points: number | null;
  /** Rating change; null when the game was not rated for this seat. */
  change: number | null;
}

export async function recentGames(userId: string, limit = 3): Promise<RecentGame[]> {
  const rows = await db
    .selectFrom('game_seat')
    .innerJoin('game', 'game.id', 'game_seat.gameId')
    .where('game_seat.userId', '=', userId)
    .where('game.status', '=', 'finished')
    .select([
      'game.id',
      'game.format',
      'game.endedAt',
      'game_seat.placement',
      'game_seat.points',
      'game_seat.ratingBefore',
      'game_seat.ratingAfter',
    ])
    .orderBy('game.endedAt', 'desc')
    .limit(limit)
    .execute();
  return rows.map((r) => ({
    id: r.id,
    format: r.format,
    endedAt: new Date(r.endedAt ?? 0).toISOString(),
    placement: r.placement,
    points: r.points,
    change: r.ratingBefore === null || r.ratingAfter === null ? null : r.ratingAfter - r.ratingBefore,
  }));
}
