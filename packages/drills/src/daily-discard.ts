// The home page's daily discard: one hand for everyone on a UTC day, and a poll of what people would throw. There is no
// right answer; the stats show only after a vote, so they can't sway it. The game server stores each day's hand ahead
// and has online bot players vote through the day (a share of the bot players, leaning to efficient discards).
import { type Kind, type RngState, kindOf, nextUint32 } from '@mahjong/engine';
import { discardOptions, stateOf } from './goals.ts';
import { generate } from './generate.ts';
import { rngOf } from './selfplay.ts';
import type { ExerciseOf } from './types.ts';

/** The day's hand: an efficiency problem (a real choice between shapes), with the round and dora to weigh. */
export function dailyDiscard(date: string): ExerciseOf<'discard'> {
  const ex = generate('efficiency', 'normal', `discard/${date}`) as ExerciseOf<'discard'>;
  return { ...ex, show: { round: true, dora: true } };
}

/** The kinds in the hand (drawn tile included): the votes that count. */
export function discardKinds(ex: ExerciseOf<'discard'>): Set<Kind> {
  return new Set(stateOf(ex)!.hand.players[0].hand.map(kindOf));
}

/** Votes per kind, most first. */
export interface Tally {
  total: number;
  counts: { kind: Kind; n: number }[];
}

/** The share of the bot players that vote on a day: seeded per day in this range. */
export const BOT_SHARE = [0.5, 0.75] as const;

const unit = (s: RngState) => nextUint32(s) / 0x100000000;

/** The day's bot share (see `BOT_SHARE`). */
export function botShare(date: string): number {
  const [lo, hi] = BOT_SHARE;
  return lo + (hi - lo) * unit(rngOf('daily-discard', date, 'share'));
}

export type Weights = { kind: Kind; w: number }[];

/**
 * How likely a bot is to throw each kind on the day: the discards that keep the hand closest lean on how many tiles
 * then improve it (the most efficient is the favourite), the rest are rare; every weight gets a per-day jitter, so the
 * favourite doesn't always come out on top.
 */
export function botWeights(ex: ExerciseOf<'discard'>, date: string): Weights {
  const opts = discardOptions(stateOf(ex)!);
  const best = Math.min(...opts.map((o) => o.shanten));
  const most = Math.max(...opts.filter((o) => o.shanten === best).map((o) => o.total), 1);
  const rng = rngOf('daily-discard', date, 'weights');
  return opts.map((o) => {
    const base = o.shanten === best ? (o.total / most) ** 3 : 0.02 / (o.shanten - best);
    return { kind: o.kind, w: base * (0.4 + 1.2 * unit(rng)) };
  });
}

/** A kind drawn by weight; `r` in [0, 1). */
export function pickWeighted(weights: Weights, r: number): Kind {
  let left = r * weights.reduce((s, x) => s + x.w, 0);
  for (const x of weights) if ((left -= x.w) < 0) return x.kind;
  return weights[weights.length - 1].kind;
}
