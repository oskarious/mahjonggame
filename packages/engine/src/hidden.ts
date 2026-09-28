// The definition of hidden information, for fairness tests: everything one seat cannot see, and a way to replace it
// with other values of the same shape. Whatever a seat is shown or does (views, hints, bot decisions, bot timing)
// must come out the same on the scrambled state; tests check that on states from simulated games.
import { seedRng } from './rng.ts';
import type { Seat } from './types.ts';
import type { Action, GameState } from './game.ts';

/**
 * A copy of `g` with everything `seat` cannot see replaced: the other seats' concealed tiles (their drawn tile stays
 * the one at the same position), the live wall, replacement tiles, unrevealed dora and ura indicators, the dead wall,
 * the other seats' furiten flags, their options and responses in an open call window, and the wall RNG. Counts
 * (hand sizes, wall size) and everything public stay.
 */
export function scrambleHidden(g: GameState, seat: Seat, random: () => number): GameState {
  const s = structuredClone(g);
  const h = s.hand;
  const others = h.players.filter((_, i) => i !== seat);
  const drawnAt = others.map((p) => (p.drawn === null ? -1 : p.hand.indexOf(p.drawn)));
  const unrevealed = h.doraIndicators.slice(h.doraRevealed);
  const slots = [h.wall, h.rinshan, h.uraIndicators, h.deadExtra, unrevealed, ...others.map((p) => p.hand)];

  const pool = slots.flat();
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  for (const slot of slots) for (let i = 0; i < slot.length; i++) slot[i] = pool.pop()!;
  h.doraIndicators.splice(h.doraRevealed, unrevealed.length, ...unrevealed);

  others.forEach((p, i) => {
    if (drawnAt[i] >= 0) p.drawn = p.hand[drawnAt[i]];
    p.tempFuriten = random() < 0.5;
    p.riichiFuriten = !!p.riichi && random() < 0.5;
  });

  const step = h.step;
  if (step.type === 'calls' || step.type === 'chankan') {
    for (let o = 0; o < 4; o++) {
      if (o === seat || o === step.seat) continue;
      const pass: Action = { type: 'pass', seat: o };
      step.options[o] = random() < 0.5 ? [] : [{ type: 'ron', seat: o }, pass];
      step.responses[o] = step.options[o].length && random() < 0.5 ? null : pass;
    }
  }
  s.rng = seedRng(String(random()));
  return s;
}
