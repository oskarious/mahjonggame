// How long a bot "thinks" before acting in a live game, so that bot players are not recognisable by their timing:
// quick for forced moves, longer for choices with many options, now and then a long think into the time bank.
// Also how long a bot takes to confirm a hand result.
import { type GameState, type Seat, kindOf, legalActions } from '@mahjong/engine';

export interface PaceOptions {
  /** Base time of the decision (what a human in the seat would get before the bank drains), ms. */
  base: number;
  /** Time bank the seat has left this hand, ms. */
  bank: number;
  /** Multiplier for every delay (admin setting); 0 makes bots instant. */
  scale: number;
  /** The dealer's first decision of a hand: a human studies the fresh hand first. */
  opening?: boolean;
}

/** Chance of a long think on an own turn with a real choice. */
const LONG_THINK = 0.05;
/** Never act closer than this to the deadline a human in the seat would have. */
const DEADLINE_MARGIN_MS = 1_000;
/** The opening decision's median think time, relative to a normal turn's. */
const OPENING_THINK = 1.8;

/** Approximately standard normal, bounded to ±3 (sum of three uniforms). */
function normal(random: () => number): number {
  return (random() + random() + random() - 1.5) * 2;
}

/** Delay in ms before the bot at `seat` acts on the current decision. Low random values give quick moves. */
export function thinkDelay(g: GameState, seat: Seat, o: PaceOptions, random: () => number): number {
  const legal = legalActions(g, seat);
  const turn = g.hand.step.type === 'turn';
  const base = o.base;
  let ms: number;
  if (legal.length <= 1) {
    ms = 300 + 500 * random();
  } else if (!turn) {
    ms = 800 + 1_700 * random();
  } else {
    const kinds = new Set(legal.flatMap((a) => (a.type === 'discard' ? [kindOf(a.tile)] : []))).size;
    const special = legal.some((a) => a.type === 'kan' || a.type === 'tsumo' || a.type === 'kyuushu' || (a.type === 'discard' && a.riichi));
    const median = (900 + 60 * kinds) * (special ? 1.6 : 1) * (o.opening ? OPENING_THINK : 1);
    ms = median * Math.exp(0.45 * normal(random));
    if (random() > 1 - LONG_THINK) ms = base * (0.6 + 0.4 * random()) + 0.6 * o.bank * random();
  }
  ms *= o.scale;
  return Math.round(Math.max(0, Math.min(ms, base + o.bank - DEADLINE_MARGIN_MS)));
}

/** Typical time for a bot to "connect" to a new game. */
const JOIN_MEDIAN_MS = 1_500;
const JOIN_MIN_MS = 400;

/** Delay in ms before a bot joins a new game (the start countdown waits for everyone); at most `maxMs`. */
export function joinDelay(random: () => number, o: { maxMs: number; scale: number }): number {
  const ms = Math.max(JOIN_MIN_MS, JOIN_MEDIAN_MS * Math.exp(0.6 * normal(random)));
  return Math.round(Math.max(0, Math.min(ms * o.scale, o.maxMs)));
}

/** Typical time to confirm a hand result. */
const READY_MEDIAN_MS = 2_500;
const READY_MIN_MS = 800;
/** Share of slow confirms (looking at the result, distracted), drawn from READY_SLOW_FROM_MS to the ready timeout. */
const READY_SLOW = 0.08;
const READY_SLOW_FROM_MS = 6_000;

/** Delay in ms before a bot confirms a hand result; at most `readyMs` (the room's wait cap). */
export function readyDelay(random: () => number, o: { readyMs: number; scale: number }): number {
  const ms =
    random() > 1 - READY_SLOW
      ? READY_SLOW_FROM_MS + (o.readyMs - READY_SLOW_FROM_MS) * random()
      : READY_MEDIAN_MS * Math.exp(0.5 * normal(random));
  return Math.round(Math.max(0, Math.min(Math.max(READY_MIN_MS, ms) * o.scale, o.readyMs)));
}
