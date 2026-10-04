// Bot games that trainer problems are taken from: realistic hands, the ones a player holds at that point of a game.
// Pure and seeded (the engine RNG, never Math.random), so a seed gives the same game on the server and in the browser.
import {
  type Action,
  type BotProfile,
  type GameState,
  type RngState,
  applyAction,
  botAction,
  botProfile,
  createGame,
  nextUint32,
  pendingSeats,
  seedRng,
} from '@mahjong/engine';
import { LESSON_RULES } from '../learn/position';

/**
 * Bots for generating: good shapes and natural calls, no defense or reading (costly, and folding hands make poor
 * problems), no blunders.
 */
const PROFILE: BotProfile = {
  ...botProfile(0.6),
  blunderRate: 0,
  defense: 0,
  reading: false,
  pushFold: false,
  readOpenHands: false,
};

/** A generator for `seed` and its parts (trainer, level, attempt, ...): independent streams per part. */
export const rngOf = (...parts: (string | number)[]): RngState => seedRng(parts.join('/'));

/** A `() => [0, 1)` source over an engine RNG, for the bots. */
const randomOf = (s: RngState) => () => nextUint32(s) / 0x100000000;

/**
 * Plays the first hand of a bot game from `seed`. `visit` sees every state before an action is chosen, and the state
 * the hand ended in; returning true stops the game there. Returns the last state.
 */
export function playHand(seed: string, visit: (g: GameState) => boolean | void): GameState {
  const random = randomOf(rngOf('play', seed));
  let g = createGame(LESSON_RULES, seed).state;
  while (g.phase === 'playing') {
    if (visit(g)) return g;
    const seat = pendingSeats(g)[0];
    const action: Action = botAction(g, seat, { profile: PROFILE, random }) ?? {
      type: 'pass',
      seat,
    };
    g = applyAction(g, action).state;
  }
  visit(g);
  return g;
}
