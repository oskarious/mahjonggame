import { describe, expect, it } from 'vitest';
import { kindOf, parseTiles } from '@mahjong/engine';
import { discardFeedback, pickFeedback, verdictFeedback } from './feedback';
import { discardAnswers, fuSteps, pickQuiz, scoreQuiz, verdict, winValue } from './goals';
import { buildPosition } from './position';
import { describe as words, plain, segments, sentences } from './text';
import type { Exercise, ExerciseOf, Position } from './types';

const kinds = (s: string) => new Set(parseTiles(s).map(kindOf));
const discard = (o: Partial<ExerciseOf<'discard'>> & Pick<ExerciseOf<'discard'>, 'position' | 'goal'>) =>
  ({ kind: 'discard', prompt: '', ...o }) as ExerciseOf<'discard'>;

describe('discard goals', () => {
  // 123m 456p 789s 3456s + 9m: dropping 9m waits on 3s/6s; dropping 3s, 6s or 9s (345s + 678s) waits on 9m.
  const position: Position = {
    hands: ['123m456p789s3456s'],
    dealer: 3,
    turn: 0,
    draws: '9m',
  };

  it('accepts every discard that reaches tenpai', () => {
    const ex = discard({ position, goal: 'tenpai' });
    expect(discardAnswers(ex, buildPosition(position))).toEqual(kinds('9m3s6s9s'));
  });

  it('narrows to the most useful tiles for max-ukeire', () => {
    const ex = discard({ position, goal: 'max-ukeire' });
    expect(discardAnswers(ex, buildPosition(position))).toEqual(kinds('9m'));
  });

  it('restricts to `only`', () => {
    const ex = discard({ position, goal: 'tenpai', only: '3s' });
    expect(discardAnswers(ex, buildPosition(position))).toEqual(kinds('3s'));
  });

  it('counts tiles in the riichi player’s river as safe', () => {
    const p = {
      hands: ['23m456p789s55m3z6s1p'],
      discards: [undefined, undefined, '4p6s1z'],
      riichi: [2],
      dealer: 3,
      turn: 0,
      draws: '8p',
    };
    const ex = discard({ position: p, goal: { safeAgainst: 2 } });
    expect(discardAnswers(ex, buildPosition(p))).toEqual(kinds('4p6s'));
  });

  it('explains a wrong discard with the distance it leaves', () => {
    const p = {
      hands: ['234m567p23s789s99s'],
      dealer: 3,
      turn: 0,
      draws: '7z',
    };
    const ex = discard({ position: p, goal: 'tenpai' });
    const g = buildPosition(p);
    expect(discardFeedback(ex, g, kindOf(parseTiles('9s')[0]), false)).toMatch(/^1 away from tenpai/);
    expect(discardFeedback(ex, g, kindOf(parseTiles('7z')[0]), true)).toBe('Tenpai, waiting on {1s} {4s}.');
  });
});

describe('pick goals', () => {
  it('finds every wait', () => {
    const position = { hands: ['123m789s23456p99s'], dealer: 3, turn: 1 };
    const ex = {
      kind: 'pick',
      prompt: '',
      position,
      goal: 'waits',
    } as ExerciseOf<'pick'>;
    expect(pickQuiz(ex, buildPosition(position)).answers).toEqual(kinds('1p4p7p'));
  });

  it('finds the dora of each indicator, wrapping around', () => {
    const position = {
      hands: ['456p789s55m23s'],
      melds: [[['ankan', '1111m']]] as never,
      dealer: 3,
      turn: 1,
      dora: '9m4z',
    };
    const ex = {
      kind: 'pick',
      prompt: '',
      position,
      goal: 'dora',
    } as ExerciseOf<'pick'>;
    expect(pickQuiz(ex, buildPosition(position)).answers).toEqual(kinds('1m1z'));
  });

  it('offers the hand for group picks and selects by tile type', () => {
    const position = { hands: ['19m28p37s1234567z'], dealer: 3, turn: 1 };
    const ex = {
      kind: 'pick',
      prompt: '',
      position,
      goal: { group: 'terminals' },
    } as ExerciseOf<'pick'>;
    const q = pickQuiz(ex, buildPosition(position));
    expect(q.palette).toHaveLength(13);
    expect(q.answers).toEqual(kinds('19m'));
  });

  it('names wrong and missing picks', () => {
    expect(pickFeedback(kinds('1p4p'), kinds('1p4p'))).toBe('');
    expect(pickFeedback(kinds('1p4p7p'), kinds('1p2p'))).toBe('Not these: {2p}. 2 missing.');
  });
});

describe('can-win', () => {
  const ron = (extra: object) =>
    buildPosition({
      hands: ['123m456p789s11z23s'],
      dealer: 3,
      turn: 2,
      draws: '4s',
      discard: true,
      ...extra,
    });

  it('tells the reason a win is not possible', () => {
    expect(verdict(ron({}))).toBe('no-yaku');
    expect(verdict(ron({ riichi: [0] }))).toBe('yes');
    expect(verdict(ron({ riichi: [0], discards: ['1s'] }))).toBe('furiten');
    expect(
      verdict(
        buildPosition({
          hands: ['123m456p789s11z23s'],
          dealer: 3,
          turn: 0,
          draws: '9s',
        }),
      ),
    ).toBe('not-complete');
  });

  it('rules out a wrong guess with an engine fact', () => {
    const g = ron({});
    expect(verdictFeedback(g, 'not-complete', 'no-yaku')).toBe('This tile does complete the hand.');
    expect(verdictFeedback(g, 'furiten', 'no-yaku')).toBe('None of your winning tiles is in your discards.');
  });

  it('refuses a discard from the left that nobody can call (seat 0 would draw)', () => {
    expect(() =>
      buildPosition({
        hands: ['123m456p789s11z23s'],
        dealer: 3,
        turn: 3,
        draws: '9m',
        discard: true,
      }),
    ).toThrow(/seat 0 would draw/);
  });
});

describe('scoring quizzes', () => {
  const p = {
    hands: ['234m456p678s55m23s'],
    riichi: [0],
    dealer: 3,
    turn: 2,
    draws: '4s',
    discard: true,
  };

  it('offers four options with the engine’s value among them', () => {
    const g = buildPosition(p);
    const right = { han: '3 han', 'han-fu': '3 han 30 fu', points: '3900' };
    for (const ask of ['han', 'han-fu', 'points'] as const) {
      const q = scoreQuiz({ kind: 'score', prompt: '', position: p, ask }, g);
      expect(q.options).toHaveLength(4);
      expect(q.options[q.answer]).toBe(right[ask]);
    }
  });

  it('includes counters and riichi sticks in what you collect', () => {
    const q = { ...p, riichi: [], honba: 2, riichiSticks: 1 };
    const quiz = scoreQuiz({ kind: 'score', prompt: '', position: q, ask: 'gain' }, buildPosition(q));
    expect(quiz.options[quiz.answer]).toBe('3600');
  });

  it('builds fu step by step up to the engine’s total', () => {
    const q = {
      hands: ['999p123m456s77m13p'],
      riichi: [0],
      dealer: 3,
      turn: 2,
      draws: '2p',
      discard: true,
    };
    const g = buildPosition(q);
    const steps = fuSteps(g);
    expect(steps.map((s) => s.answer)).toEqual([20, 10, 8, 2, 40]);
    for (const s of steps) expect(s.options).toContain(s.answer);
    expect(winValue(g).value.fu).toBe(40);
  });
});

describe('lesson text', () => {
  it('splits tile tokens out of text', () => {
    expect(segments('Discard {5p} to wait on {14m}.')).toEqual([
      { text: 'Discard ' },
      { tiles: '5p' },
      { text: ' to wait on ' },
      { tiles: '14m' },
      { text: '.' },
    ]);
  });

  it('names tiles in words, red fives included', () => {
    expect(words('123m')).toBe('1 characters, 2 characters and 3 characters');
    expect(words('0p')).toBe('red 5 circles');
    expect(plain('Win on {5z}.')).toBe('Win on White.');
  });

  it('counts sentences', () => {
    const ex: Exercise = {
      kind: 'choice',
      prompt: 'One. Two? Three!',
      options: [],
      answer: 0,
    };
    expect(sentences(ex.prompt)).toBe(3);
    expect(sentences('You drew {7z}. Discard it.')).toBe(2);
  });
});
