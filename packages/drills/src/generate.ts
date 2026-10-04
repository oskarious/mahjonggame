// Trainer problems: a pure function of (trainer, level, seed) that returns a Learn exercise, so the right answers and
// the explanations come from the same engine-backed goals and feedback as the lessons.
import {
  type GameState,
  type RngState,
  type Tile,
  type WinRecord,
  type YakuId,
  analyzeHand,
  countKinds,
  isHonor,
  parseTiles,
  randomInt,
  shanten,
  waits,
} from '@mahjong/engine';
import { discardAnswers, discardOptions } from './goals.ts';
import { buildPosition } from './position.ts';
import type { Exercise, ExerciseOf, Position } from './types.ts';
import { handPosition, turnPosition, winPosition } from './rebuild.ts';
import { playHand, rngOf } from './selfplay.ts';

export type TrainerId = 'efficiency' | 'waits' | 'yaku' | 'score';

/** Levels per trainer, easiest first (the first is the default). */
export const LEVELS = {
  efficiency: ['easy', 'normal', 'hard'],
  waits: ['normal', 'one-suit'],
  yaku: ['all'],
  score: ['han-fu', 'points', 'fu'],
} as const satisfies Record<TrainerId, readonly string[]>;

export type LevelOf<T extends TrainerId> = (typeof LEVELS)[T][number];
export type Level = LevelOf<TrainerId>;

/** Games (or drawn hands) tried for one problem before giving up on the filters. */
export const BUDGET = 16;

/** Wins a rebuilt position cannot carry: they depend on the moment (wall end, kan, first turn, ippatsu). */
const LUCK: YakuId[] = ['ippatsu', 'doubleRiichi', 'rinshan', 'chankan', 'haitei', 'houtei', 'renhou'];

export function isLevel<T extends TrainerId>(trainer: T, level: string): level is LevelOf<T> {
  return (LEVELS[trainer] as readonly string[]).includes(level);
}

/**
 * The problem for `seed`. Tries games `seed/0`, `seed/1`, ... until one holds a moment that passes the trainer's
 * filters; after the budget the filters are dropped, so a problem always comes back.
 */
export function generate(trainer: TrainerId, level: Level, seed: string): Exercise {
  return generateCounted(trainer, level, seed).exercise;
}

/** `generate`, and how many games it took (for the budget test). */
export function generateCounted(trainer: TrainerId, level: Level, seed: string): { exercise: Exercise; games: number } {
  for (let n = 0; n < BUDGET * 2; n++) {
    const found = attempt(trainer, level, `${trainer}/${level}/${seed}/${n}`, n < BUDGET);
    if (found) return { exercise: found, games: n + 1 };
  }
  throw new Error(`No ${trainer} problem for ${seed}`);
}

function attempt(trainer: TrainerId, level: Level, game: string, strict: boolean): Exercise | null {
  const rng = rngOf('pick', game);
  switch (trainer) {
    case 'efficiency':
      return efficiency(level as LevelOf<'efficiency'>, game, strict);
    case 'waits':
      return level === 'one-suit' ? oneSuitWaits(rng, strict) : playedWaits(game, rng, strict);
    case 'yaku':
      return yaku(game, rng, strict);
    case 'score':
      return score(level as LevelOf<'score'>, game);
  }
}

// --- efficiency ----------------------------------------------------------------------------------------------

const SHANTEN: Record<LevelOf<'efficiency'>, number> = {
  easy: 1,
  normal: 2,
  hard: 3,
};

/**
 * A real decision: discards that keep the hand closest do not all keep the same number of tiles, and (above Easy)
 * the best is not just an isolated honor to throw.
 */
export function isEfficiencyDecision(ex: ExerciseOf<'discard'>, g: GameState, level: LevelOf<'efficiency'>): boolean {
  const opts = discardOptions(g);
  const best = opts[0].shanten;
  const top = opts.filter((o) => o.shanten === best);
  if (new Set(top.map((o) => o.total)).size < 2) return false;
  if (level === 'easy') return true;
  const held = countKinds(g.hand.players[0].hand);
  return ![...discardAnswers(ex, g)].every((k) => isHonor(k) && held[k] === 1);
}

/** The first turn in the game where a seat without calls holds a hand of the level that is a real decision. */
function efficiency(level: LevelOf<'efficiency'>, game: string, strict: boolean): Exercise | null {
  let found: Exercise | null = null;
  playHand(game, (g) => {
    const step = g.hand.step;
    if (step.type !== 'turn') return;
    const reader = step.seat;
    const me = g.hand.players[reader];
    if (me.melds.length || me.riichi || me.drawn === null) return;
    if (shanten(countKinds(me.hand), 0) !== SHANTEN[level]) return;
    const ex: ExerciseOf<'discard'> = {
      kind: 'discard',
      prompt: 'Discard for the most tiles that improve your hand.',
      position: turnPosition(g, reader),
      goal: 'max-ukeire',
      show: { dora: true },
    };
    if (strict && !isEfficiencyDecision(ex, buildPosition(ex.position), level)) return;
    found = ex;
    return true;
  });
  return found;
}

// --- waits ---------------------------------------------------------------------------------------------------

const ALL_LIVE = Array<number>(34).fill(4);
const isTenpai = (hand: readonly Tile[]) => analyzeHand(hand, [], ALL_LIVE).tenpai;

const waitsExercise = (position: Position): Exercise => ({
  kind: 'pick',
  prompt: 'Pick every winning tile.',
  position,
  goal: 'waits',
});

/**
 * The first closed tenpai hand in the game, right after its discard. Single-wait hands are allowed in one problem
 * out of three at most, so most problems need reading the shape.
 */
function playedWaits(game: string, rng: RngState, strict: boolean): Exercise | null {
  const singleOk = !strict || randomInt(rng, 3) === 0;
  let found: Exercise | null = null;
  playHand(game, (g) => {
    const reader = g.hand.lastDiscard?.seat;
    if (reader === undefined) return;
    const me = g.hand.players[reader];
    if (me.melds.length || me.hand.length !== 13) return;
    if (!isTenpai(me.hand) || (!singleOk && waits(me.hand, []).length < 2)) return;
    found = waitsExercise(handPosition(g, reader));
    return true;
  });
  return found;
}

/** A complete one-suit hand (four sets and a pair) less one tile, waiting on at least three kinds. */
function oneSuitWaits(rng: RngState, strict: boolean): Exercise | null {
  const suit = randomInt(rng, 3);
  for (let tries = 0; tries < 50; tries++) {
    const counts = Array<number>(9).fill(0);
    counts[randomInt(rng, 9)] += 2;
    for (let s = 0; s < 4; s++) {
      if (randomInt(rng, 4) === 0) counts[randomInt(rng, 9)] += 3;
      else {
        const start = randomInt(rng, 7);
        for (let r = start; r < start + 3; r++) counts[r]++;
      }
    }
    if (counts.some((c) => c > 4)) continue;
    const ranks = counts.flatMap((c, r) => Array<number>(c).fill(r + 1));
    ranks.splice(randomInt(rng, ranks.length), 1);
    const notation = `${ranks.join('')}${'mps'[suit]}`;
    const tiles = parseTiles(notation);
    if (!isTenpai(tiles)) continue;
    if (strict && waits(tiles, []).length < 3) continue;
    return waitsExercise({
      hands: [notation],
      dealer: 3,
      turn: 1,
      dora: '1z',
      ura: '1z',
    });
  }
  return null;
}

// --- yaku and score ------------------------------------------------------------------------------------------

/** The hand's first win that a rebuilt position can carry (no luck yaku, yakuman or liability). */
export function harvestWin(game: string): { g: GameState; w: WinRecord } | null {
  const end = playHand(game, () => false);
  if (end.result?.type !== 'win') return null;
  const w = end.result.wins[0];
  if (w.pao !== null || w.value.yakuman.length || w.value.yaku.some((y) => LUCK.includes(y.id))) return null;
  return { g: end, w };
}

const WIN_SHOW = { round: true, seat: true, dora: true };

/** At least half of the problems have two or more yaku (dora not counted): one yaku alone is mostly riichi. */
function yaku(game: string, rng: RngState, strict: boolean): Exercise | null {
  const needTwo = strict && randomInt(rng, 2) === 0;
  const win = harvestWin(game);
  if (!win || (needTwo && win.w.value.yaku.length < 2)) return null;
  return {
    kind: 'yaku',
    prompt: 'Pick every yaku in this hand.',
    position: winPosition(win.g, win.w),
    show: WIN_SHOW,
  };
}

function score(level: LevelOf<'score'>, game: string): Exercise | null {
  const win = harvestWin(game);
  if (!win) return null;
  const position = winPosition(win.g, win.w);
  if (level === 'fu') return { kind: 'fu', prompt: 'Count the fu.', position, show: WIN_SHOW };
  return {
    kind: 'score',
    prompt: level === 'points' ? 'How many points does it win?' : 'What is this hand worth?',
    position,
    ask: level,
    show: WIN_SHOW,
  };
}
