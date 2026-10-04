// The home page's daily discard (see @mahjong/drills/daily-discard): this server stores each day's hand ahead of the
// day, and online bot players vote through the day: the day's share of the bot players, paced over the UTC day.
import { botShare, botWeights, dailyDiscard, pickWeighted, type Weights } from '@mahjong/drills/daily-discard';
import type { Kysely } from 'kysely';
import type { DB } from './db.ts';
import { shuffle } from './matchmaking.ts';

/** Chance per run (every minute) that an online bot who hasn't voted votes now: spreads the votes over the day. */
export const VOTE_CHANCE = 0.05;

/** YYYY-MM-DD in UTC, `days` from `now`. */
export const utcDate = (now: number, days = 0) => new Date(now + days * 86_400_000).toISOString().slice(0, 10);

/** Stores the hands of today and tomorrow if missing. Generating takes up to ~70 ms, so only missing days are made. */
export async function ensureHands(db: Kysely<DB>, now = Date.now()): Promise<number> {
  let made = 0;
  for (const date of [utcDate(now), utcDate(now, 1)]) {
    const has = await db.selectFrom('daily_discard').select('date').where('date', '=', date).executeTakeFirst();
    if (has) continue;
    const r = await db
      .insertInto('daily_discard')
      .values({ date, exercise: JSON.stringify(dailyDiscard(date)), botShare: botShare(date) })
      .onConflict((oc) => oc.column('date').doNothing())
      .executeTakeFirst();
    made += Number(r.numInsertedOrUpdatedRows ?? 0);
  }
  return made;
}

/**
 * The bots that vote now: each candidate with `chance`, at most `need`. Pure (for tests); `random` in [0, 1).
 */
export function pickVoters(candidates: readonly string[], need: number, chance: number, random: () => number): string[] {
  const out: string[] = [];
  for (const id of candidates) {
    if (out.length >= need) break;
    if (random() < chance) out.push(id);
  }
  return out;
}

// The day's weights, worked out once per day per process (they need the hand analysed).
let weightsCache: { date: string; weights: Weights } | null = null;

/**
 * The bot votes due by `now`: the day's share of the bot players, paced evenly over the UTC day so the bots online
 * early don't use it all up.
 */
export function botTarget(botShare: number, population: number, now: number): number {
  const dayPart = (now % 86_400_000) / 86_400_000;
  return Math.floor(botShare * population * dayPart);
}

/**
 * One run of bot voting: while the bot votes are below the target (`botTarget`), some online bots that haven't voted
 * today vote, each for a kind drawn from the day's weights. Returns the number of votes cast.
 */
export async function botVotes(
  db: Kysely<DB>,
  online: readonly string[],
  population: number,
  random: () => number,
  now = Date.now(),
) {
  const date = utcDate(now);
  const day = await db.selectFrom('daily_discard').select(['exercise', 'botShare']).where('date', '=', date).executeTakeFirst();
  if (!day || !online.length) return 0;

  const cast = await db
    .selectFrom('daily_discard_vote as v')
    .innerJoin('bot as b', 'b.userId', 'v.userId')
    .select((eb) => eb.fn.countAll<string>().as('n'))
    .where('v.date', '=', date)
    .executeTakeFirstOrThrow();
  const need = botTarget(day.botShare, population, now) - Number(cast.n);
  if (need <= 0) return 0;

  const voted = new Set(
    (await db.selectFrom('daily_discard_vote').select('userId').where('date', '=', date).where('userId', 'in', online).execute()).map(
      (r) => r.userId,
    ),
  );
  const voters = pickVoters(shuffle(online.filter((id) => !voted.has(id)), random), need, VOTE_CHANCE, random);
  if (!voters.length) return 0;

  if (weightsCache?.date !== date) weightsCache = { date, weights: botWeights(day.exercise, date) };
  const weights = weightsCache.weights;
  const r = await db
    .insertInto('daily_discard_vote')
    .values(voters.map((userId) => ({ date, userId, kind: pickWeighted(weights, random()) })))
    .onConflict((oc) => oc.columns(['date', 'userId']).doNothing())
    .executeTakeFirst();
  return Number(r.numInsertedOrUpdatedRows ?? 0);
}
