// How long a bot "thinks" before acting in a live game, so that bot players are not recognisable by their timing:
// quick for forced moves, longer for choices with many options, now and then a long think into the time bank.
// Also how long a bot takes to join a new game and to confirm a hand result. The numbers are runtime settings
// (settings.ts, edited on /admin).
import { type GameState, type Seat, kindOf, legalActions } from '@mahjong/engine';
import type { BotSettings } from '@mahjong/protocol';

/** The bot settings that shape delays. */
export type Pace = Pick<
  BotSettings,
  | 'thinkScale'
  | 'thinkForcedMs'
  | 'thinkCallMs'
  | 'thinkTurnMs'
  | 'thinkPerTileMs'
  | 'thinkSpecialScale'
  | 'thinkOpeningScale'
  | 'longThinkPercent'
  | 'joinMedianMs'
  | 'joinMinMs'
  | 'readyMedianMs'
  | 'readyMinMs'
  | 'readySlowPercent'
  | 'readySlowFromMs'
>;

export interface ThinkOptions {
  /** Base time of the decision (what a human in the seat would get before the bank drains), ms. */
  base: number;
  /** Time bank the seat has left this hand, ms. */
  bank: number;
  /** The dealer's first decision of a hand: a human studies the fresh hand first. */
  opening?: boolean;
}

/** Never act closer than this to the deadline a human in the seat would have. */
const DEADLINE_MARGIN_MS = 1_000;

/** Approximately standard normal, bounded to ±3 (sum of three uniforms). */
function normal(random: () => number): number {
  return (random() + random() + random() - 1.5) * 2;
}

const between = ([lo, hi]: [number, number], random: () => number) => lo + (hi - lo) * random();

/** Delay in ms before the bot at `seat` acts on the current decision. Low random values give quick moves. */
export function thinkDelay(g: GameState, seat: Seat, o: ThinkOptions, p: Pace, random: () => number): number {
  const legal = legalActions(g, seat);
  const turn = g.hand.step.type === 'turn';
  const base = o.base;
  let ms: number;
  if (legal.length <= 1) {
    ms = between(p.thinkForcedMs, random);
  } else if (!turn) {
    ms = between(p.thinkCallMs, random);
  } else {
    const kinds = new Set(legal.flatMap((a) => (a.type === 'discard' ? [kindOf(a.tile)] : []))).size;
    const special = legal.some(
      (a) => a.type === 'kan' || a.type === 'tsumo' || a.type === 'kyuushu' || (a.type === 'discard' && a.riichi),
    );
    const median =
      (p.thinkTurnMs + p.thinkPerTileMs * kinds) *
      (special ? p.thinkSpecialScale : 1) *
      (o.opening ? p.thinkOpeningScale : 1);
    ms = median * Math.exp(0.45 * normal(random));
    if (random() > 1 - p.longThinkPercent / 100) ms = base * (0.6 + 0.4 * random()) + 0.6 * o.bank * random();
  }
  ms *= p.thinkScale;
  return Math.round(Math.max(0, Math.min(ms, base + o.bank - DEADLINE_MARGIN_MS)));
}

/** Delay in ms before a bot joins a new game (the start countdown waits for everyone); at most `maxMs`. */
export function joinDelay(random: () => number, maxMs: number, p: Pace): number {
  const ms = Math.max(p.joinMinMs, p.joinMedianMs * Math.exp(0.6 * normal(random)));
  return Math.round(Math.max(0, Math.min(ms * p.thinkScale, maxMs)));
}

/** Delay in ms before a bot confirms a hand result; at most `readyMs` (the room's wait cap). */
export function readyDelay(random: () => number, readyMs: number, p: Pace): number {
  const ms =
    random() > 1 - p.readySlowPercent / 100
      ? p.readySlowFromMs + (readyMs - p.readySlowFromMs) * random()
      : p.readyMedianMs * Math.exp(0.5 * normal(random));
  return Math.round(Math.max(0, Math.min(Math.max(p.readyMinMs, ms) * p.thinkScale, readyMs)));
}
