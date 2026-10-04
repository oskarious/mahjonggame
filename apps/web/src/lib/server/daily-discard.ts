import type { Cookies } from '@sveltejs/kit';
import type { Kind } from '@mahjong/engine';
import { type Tally, botShare, dailyDiscard, discardKinds } from '@mahjong/drills/daily-discard';
import type { ExerciseOf } from '@mahjong/drills/types';
import { randomId } from '$lib/random';
import { db } from './db';

// The stored hand, read once per UTC day per server process.
let cache: { date: string; exercise: ExerciseOf<'discard'>; kinds: Set<Kind> } | null = null;

/**
 * The day's hand from the database. The game server stores it ahead of the day; if it hasn't (not running, as in some
 * dev setups), this stores it: the hand is a pure function of the date, so both write the same row.
 */
export async function todaysDiscard(date: string) {
  if (cache?.date === date) return cache;
  let row = await db.selectFrom('daily_discard').select('exercise').where('date', '=', date).executeTakeFirst();
  if (!row) {
    await db
      .insertInto('daily_discard')
      .values({ date, exercise: JSON.stringify(dailyDiscard(date)), botShare: botShare(date) })
      .onConflict((oc) => oc.column('date').doNothing())
      .execute();
    row = await db.selectFrom('daily_discard').select('exercise').where('date', '=', date).executeTakeFirstOrThrow();
  }
  cache = { date, exercise: row.exercise, kinds: discardKinds(row.exercise) };
  return cache;
}

const COOKIE = 'riichi_voter';

/** Who is voting: the account and/or this browser's guest id. */
export interface Voter {
  userId: string | null;
  guestId: string | null;
}

/**
 * The voter of this request. Both ids are checked, so a guest who signs in after voting still sees the stats rather
 * than a second ballot. `create` gives a new guest browser an id (only when voting).
 */
export function voterOf(cookies: Cookies, user: { id: string } | null, secure: boolean, create = false): Voter {
  let guestId = cookies.get(COOKIE) ?? null;
  if (!guestId && create && !user) {
    guestId = randomId();
    cookies.set(COOKIE, guestId, { path: '/', httpOnly: true, sameSite: 'lax', secure, maxAge: 60 * 60 * 24 * 400 });
  }
  return { userId: user?.id ?? null, guestId };
}

/** The kind this voter discarded today, if any. */
export async function myVote(date: string, v: Voter): Promise<Kind | null> {
  if (!v.userId && !v.guestId) return null;
  const r = await db
    .selectFrom('daily_discard_vote')
    .select('kind')
    .where('date', '=', date)
    .where((eb) =>
      eb.or([
        ...(v.userId ? [eb('userId', '=', v.userId)] : []),
        ...(v.guestId ? [eb('guestId', '=', v.guestId)] : []),
      ]),
    )
    .executeTakeFirst();
  return r ? (r.kind as Kind) : null;
}

/** Records a vote (as the user when signed in, else as the guest) unless the voter has one; returns the vote that stands. */
export async function vote(date: string, v: Voter, kind: Kind): Promise<Kind> {
  const before = await myVote(date, v);
  if (before !== null) return before;
  const by = v.userId ? { userId: v.userId } : { guestId: v.guestId };
  await db
    .insertInto('daily_discard_vote')
    .values({ date, kind, ...by })
    .onConflict((oc) => oc.columns(v.userId ? ['date', 'userId'] : ['date', 'guestId']).doNothing())
    .execute();
  return (await myVote(date, v)) ?? kind;
}

/** Everyone's votes (bot players' included), most first. */
export async function tally(date: string): Promise<Tally> {
  const rows = await db
    .selectFrom('daily_discard_vote')
    .select(['kind', (eb) => eb.fn.countAll<string>().as('n')])
    .where('date', '=', date)
    .groupBy('kind')
    .orderBy('n', 'desc')
    .orderBy('kind')
    .execute();
  const counts = rows.map((r) => ({ kind: r.kind as Kind, n: Number(r.n) }));
  return { total: counts.reduce((s, c) => s + c.n, 0), counts };
}
