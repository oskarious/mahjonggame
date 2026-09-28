// How long a bot "thinks" before acting in a live game, so that bot players are not recognisable by their timing:
// quick for forced moves, longer for choices with many options, now and then a long think into the time bank.
import { type GameState, type Seat, kindOf, legalActions } from '@mahjong/engine';

export interface PaceOptions {
  turnMs: number;
  callMs: number;
  /** Time bank the seat has left this hand, ms. */
  bank: number;
  /** Multiplier for every delay (admin setting); 0 makes bots instant. */
  scale: number;
}

/** Chance of a long think on an own turn with a real choice. */
const LONG_THINK = 0.05;
/** Never act closer than this to the deadline a human in the seat would have. */
const DEADLINE_MARGIN_MS = 1_000;

/** Approximately standard normal, bounded to ±3 (sum of three uniforms). */
function normal(random: () => number): number {
  return (random() + random() + random() - 1.5) * 2;
}

/** Delay in ms before the bot at `seat` acts on the current decision. Low random values give quick moves. */
export function thinkDelay(g: GameState, seat: Seat, o: PaceOptions, random: () => number): number {
  const legal = legalActions(g, seat);
  const turn = g.hand.step.type === 'turn';
  const base = turn ? o.turnMs : o.callMs;
  let ms: number;
  if (legal.length <= 1) {
    ms = 300 + 500 * random();
  } else if (!turn) {
    ms = 800 + 1_700 * random();
  } else {
    const kinds = new Set(legal.flatMap((a) => (a.type === 'discard' ? [kindOf(a.tile)] : []))).size;
    const special = legal.some((a) => a.type === 'kan' || a.type === 'tsumo' || a.type === 'kyuushu' || (a.type === 'discard' && a.riichi));
    const median = (900 + 60 * kinds) * (special ? 1.6 : 1);
    ms = median * Math.exp(0.45 * normal(random));
    if (random() > 1 - LONG_THINK) ms = base * (0.6 + 0.4 * random()) + 0.6 * o.bank * random();
  }
  ms *= o.scale;
  return Math.round(Math.max(0, Math.min(ms, base + o.bank - DEADLINE_MARGIN_MS)));
}
