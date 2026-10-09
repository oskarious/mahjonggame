import { describe, expect, it } from 'vitest';
import {
  type TrainData,
  applyTrain,
  cleanTrain,
  dailyStreak,
  emptyTrain,
  mergeTrain,
  parseStats,
  validTrainEvent,
} from './stats-data';

const catalog = { trainers: ['efficiency', 'waits'], dailySize: 3 };

describe('applyTrain', () => {
  it('counts first-try answers into the streak and resets it on a miss', () => {
    const d = emptyTrain();
    for (const firstTry of [true, true, false, true]) applyTrain(d, { kind: 'answer', trainer: 'waits', firstTry }, 3);
    expect(d.trainers.waits).toEqual({ answered: 4, firstTry: 3, streak: 1, bestStreak: 2, rushBest: 0 });
  });

  it('keeps the best Rush', () => {
    const d = emptyTrain();
    applyTrain(d, { kind: 'rush', trainer: 'efficiency', score: 9 }, 3);
    applyTrain(d, { kind: 'rush', trainer: 'efficiency', score: 4 }, 3);
    expect(d.trainers.efficiency?.rushBest).toBe(9);
  });

  it('ignores daily answers beyond the set', () => {
    const d = emptyTrain();
    for (const right of [true, false, true, true]) applyTrain(d, { kind: 'daily', date: '2026-10-05', right }, 3);
    expect(d.daily['2026-10-05']).toEqual([true, false, true]);
  });
});

describe('mergeTrain', () => {
  it('sums answers, keeps the higher bests and the account streak', () => {
    const into: TrainData = {
      v: 1,
      trainers: { waits: { answered: 10, firstTry: 6, streak: 2, bestStreak: 5, rushBest: 3 } },
      daily: { '2026-10-04': [true, true, true] },
    };
    const from: TrainData = {
      v: 1,
      trainers: {
        waits: { answered: 4, firstTry: 4, streak: 4, bestStreak: 4, rushBest: 7 },
        efficiency: { answered: 2, firstTry: 1, streak: 1, bestStreak: 1, rushBest: 0 },
      },
      daily: { '2026-10-04': [false, false, false], '2026-10-05': [true] },
    };
    mergeTrain(into, from);
    expect(into.trainers).toEqual({
      waits: { answered: 14, firstTry: 10, streak: 2, bestStreak: 5, rushBest: 7 },
      efficiency: { answered: 2, firstTry: 1, streak: 1, bestStreak: 1, rushBest: 0 },
    });
    expect(into.daily).toEqual({ '2026-10-04': [true, true, true], '2026-10-05': [true] });
  });
});

describe('cleanTrain', () => {
  it('drops unknown trainers, bad counts, future and malformed days', () => {
    const raw = {
      v: 1,
      trainers: {
        waits: { answered: 3, firstTry: 9, streak: -1, bestStreak: 2.5, rushBest: 4 },
        nope: { answered: 1, firstTry: 1, streak: 1, bestStreak: 1, rushBest: 1 },
      },
      daily: { '2026-10-05': [true, 'x', false, true, true], '2026-10-06': [true], yesterday: [true] },
    };
    expect(cleanTrain(raw, catalog, '2026-10-05')).toEqual({
      v: 1,
      trainers: { waits: { answered: 3, firstTry: 3, streak: 0, bestStreak: 0, rushBest: 4 } },
      daily: { '2026-10-05': [true, false, true] },
    });
  });

  it.each([null, 'x', { v: 2, trainers: {}, daily: {} }, { v: 1, trainers: [] }])('reads %j as empty', (raw) => {
    expect(cleanTrain(raw, catalog, '2026-10-05')).toEqual(emptyTrain());
  });

  it('reads unparsable device storage as empty', () => {
    expect(parseStats('{')).toEqual(emptyTrain());
  });
});

describe('validTrainEvent', () => {
  const today = '2026-10-05';
  it.each([
    [{ kind: 'answer', trainer: 'waits', firstTry: true }, true],
    [{ kind: 'answer', trainer: 'nope', firstTry: true }, false],
    [{ kind: 'rush', trainer: 'waits', score: 3 }, true],
    [{ kind: 'rush', trainer: 'waits', score: -1 }, false],
    [{ kind: 'rush', trainer: 'waits', score: 1.5 }, false],
    [{ kind: 'daily', date: '2026-10-05', right: true }, true],
    [{ kind: 'daily', date: '2026-10-04', right: true }, true],
    [{ kind: 'daily', date: '2026-10-03', right: true }, false],
    [{ kind: 'daily', date: '2026-10-06', right: true }, false],
  ] as const)('%j → %s', (e, ok) => {
    expect(validTrainEvent(e as never, catalog, today)).toBe(ok);
  });
});

describe('dailyStreak', () => {
  const d: TrainData = {
    v: 1,
    trainers: {},
    daily: { '2026-10-02': [true, true, true], '2026-10-03': [true, false, true], '2026-10-04': [false, false, false] },
  };
  it('counts finished days back from today, today unfinished not breaking it', () => {
    expect(dailyStreak(d, '2026-10-05', 3)).toBe(3);
    expect(dailyStreak({ ...d, daily: { ...d.daily, '2026-10-05': [true, true, true] } }, '2026-10-05', 3)).toBe(4);
    expect(dailyStreak(d, '2026-10-06', 3)).toBe(0);
  });
});
