// Seed sweep: every trainer and level generates deterministic problems with a right answer by the engine, the
// filters hold, rebuilt wins score exactly as the game paid them, and generation stays within budget.
import { describe, expect, it } from 'vitest';
import { analyzeHand, countKinds, isHonor, kindOf, parseTiles, waits } from '@mahjong/engine';
import {
  discardAnswers,
  discardOptions,
  fuSteps,
  pickQuiz,
  scoreQuiz,
  stateOf,
  winValue,
  yakuQuiz,
} from '../src/goals.ts';
import { buildPosition } from '../src/position.ts';
import type { ExerciseOf } from '../src/types.ts';
import {
  BUDGET,
  LEVELS,
  type Level,
  type TrainerId,
  generate,
  generateCounted,
  harvestWin,
  isEfficiencyDecision,
} from '../src/generate.ts';
import { winPosition } from '../src/rebuild.ts';

const SEEDS = Array.from({ length: 40 }, (_, i) => `t${i}`);
const SLOW = 120_000;

function sweep(trainer: TrainerId, level: Level) {
  return SEEDS.map((seed) => {
    const { exercise, games } = generateCounted(trainer, level, seed);
    // Within the budget, with the filters on.
    expect(games, `${trainer} ${level} ${seed}`).toBeLessThanOrEqual(BUDGET);
    return { seed, ex: exercise };
  });
}

describe('trainer problems', () => {
  it(
    'are deterministic',
    () => {
      for (const trainer of Object.keys(LEVELS) as TrainerId[])
        for (const level of LEVELS[trainer]) {
          expect(generate(trainer, level, 'same')).toEqual(generate(trainer, level, 'same'));
        }
    },
    SLOW,
  );

  for (const level of LEVELS.efficiency) {
    it(
      `efficiency ${level}: a real decision at the level's shanten`,
      () => {
        const shanten = { easy: 1, normal: 2, hard: 3 }[level];
        for (const { seed, ex } of sweep('efficiency', level)) {
          const d = ex as ExerciseOf<'discard'>;
          const g = buildPosition(d.position);
          const opts = discardOptions(g);
          expect(opts[0].shanten, seed).toBe(shanten);
          expect(g.hand.players[0].hand.length, seed).toBe(14);
          expect(g.hand.players[0].melds, seed).toEqual([]);
          expect(discardAnswers(d, g).size, seed).toBeGreaterThan(0);
          expect(isEfficiencyDecision(d, g, level), seed).toBe(true);
          const top = opts.filter((o) => o.shanten === shanten);
          expect(new Set(top.map((o) => o.total)).size, seed).toBeGreaterThan(1);
          if (level !== 'easy') {
            const held = countKinds(g.hand.players[0].hand);
            expect(
              [...discardAnswers(d, g)].every((k) => isHonor(k) && held[k] === 1),
              seed,
            ).toBe(false);
          }
          // Counted against the hand and the dora indicator only.
          expect(
            g.hand.players.every((p) => p.discards.length === 0),
            seed,
          ).toBe(true);
        }
      },
      SLOW,
    );
  }

  it(
    'waits normal: closed tenpai hands, at most a third with a single winning kind',
    () => {
      const problems = sweep('waits', 'normal');
      let singles = 0;
      for (const { seed, ex } of problems) {
        const g = stateOf(ex)!;
        const me = g.hand.players[0];
        expect(me.hand.length, seed).toBe(13);
        expect(analyzeHand(me.hand, [], Array(34).fill(4)).tenpai, seed).toBe(true);
        expect(pickQuiz(ex as ExerciseOf<'pick'>, g).answers.size, seed).toBeGreaterThan(0);
        if (waits(me.hand, []).length === 1) singles++;
      }
      expect(singles).toBeLessThanOrEqual(problems.length / 3);
    },
    SLOW,
  );

  it(
    'waits one suit: a single suit, three or more winning kinds, suits vary',
    () => {
      const suits = new Set<number>();
      for (const { seed, ex } of sweep('waits', 'one-suit')) {
        const hand = stateOf(ex)!.hand.players[0].hand;
        const suit = Math.floor(kindOf(hand[0]) / 9);
        suits.add(suit);
        expect(
          hand.every((t) => Math.floor(kindOf(t) / 9) === suit),
          seed,
        ).toBe(true);
        expect(waits(hand, []).length, seed).toBeGreaterThanOrEqual(3);
      }
      expect(suits.size).toBe(3);
    },
    SLOW,
  );

  it(
    'yaku: at least half have two or more yaku, every answer is offered',
    () => {
      const problems = sweep('yaku', 'all');
      let two = 0;
      for (const { seed, ex } of problems) {
        const g = stateOf(ex)!;
        const { value } = winValue(g);
        expect(value.yaku.length, seed).toBeGreaterThan(0);
        if (value.yaku.length >= 2) two++;
        const quiz = yakuQuiz(ex as ExerciseOf<'yaku'>, g);
        for (const y of quiz.answers) expect(quiz.options, seed).toContain(y);
      }
      expect(two).toBeGreaterThanOrEqual(problems.length / 2);
    },
    SLOW,
  );

  for (const level of LEVELS.score) {
    it(
      `score ${level}: answerable`,
      () => {
        for (const { seed, ex } of sweep('score', level)) {
          const g = stateOf(ex)!;
          if (ex.kind === 'fu') expect(fuSteps(g).at(-1)!.answer, seed).toBe(winValue(g).value.fu);
          else {
            const q = scoreQuiz(ex as ExerciseOf<'score'>, g);
            expect(q.options[q.answer], seed).toBeDefined();
            expect(q.options.length, seed).toBeGreaterThanOrEqual(3);
          }
        }
      },
      SLOW,
    );
  }

  it(
    'rebuilt wins score exactly as the game paid them',
    () => {
      let checked = 0;
      for (let i = 0; i < 120; i++) {
        const win = harvestWin(`rebuild/${i}`);
        if (!win) continue;
        checked++;
        const { value } = winValue(buildPosition(winPosition(win.g, win.w)));
        const paid = win.w.value;
        expect(
          {
            han: value.han,
            fu: value.fu,
            base: value.basePoints,
            yaku: value.yaku,
          },
          `game ${i}`,
        ).toEqual({
          han: paid.han,
          fu: paid.fu,
          base: paid.basePoints,
          yaku: paid.yaku,
        });
        expect([value.dora, value.redDora, value.uraDora], `game ${i}`).toEqual([
          paid.dora,
          paid.redDora,
          paid.uraDora,
        ]);
      }
      expect(checked).toBeGreaterThan(60);
    },
    SLOW,
  );
});

describe('trainer scenarios', () => {
  it('nobetan: three sets plus 2345p waits on 2p and 5p', () => {
    const ex: ExerciseOf<'pick'> = {
      kind: 'pick',
      prompt: '',
      position: { hands: ['123m456s789s2345p'], dealer: 3, turn: 1 },
      goal: 'waits',
    };
    expect([...pickQuiz(ex, stateOf(ex)!).answers]).toEqual(parseTiles('2p5p').map(kindOf));
  });

  it('tied best discards are all accepted', () => {
    // 1m and 9s are both isolated terminals: either keeps the same tiles.
    const ex: ExerciseOf<'discard'> = {
      kind: 'discard',
      prompt: '',
      position: {
        hands: ['1m345p678p23s567s9s'],
        draws: '5m',
        dealer: 0,
        turn: 0,
      },
      goal: 'max-ukeire',
    };
    const ok = discardAnswers(ex, stateOf(ex)!);
    expect(ok.has(kindOf(parseTiles('1m')[0])) && ok.has(kindOf(parseTiles('9s')[0]))).toBe(true);
  });

  it('points: a non-dealer ron of 3 han 30 fu is 3900', () => {
    // Riichi, pinfu, tanyao: 3 han 30 fu by ron (ura indicator 1z: no ura dora).
    const ex: ExerciseOf<'score'> = {
      kind: 'score',
      prompt: '',
      position: {
        hands: ['234m456p678s3488s'],
        riichi: [0],
        dealer: 1,
        turn: 2,
        draws: '5s',
        discard: true,
        dora: '1z',
        ura: '1z',
      },
      ask: 'points',
    };
    const g = stateOf(ex)!;
    expect(winValue(g).value).toMatchObject({ han: 3, fu: 30 });
    const q = scoreQuiz(ex, g);
    expect(q.options[q.answer]).toBe('3900');
  });
});
