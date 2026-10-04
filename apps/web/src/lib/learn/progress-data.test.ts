import { describe, expect, it } from 'vitest';
import { lessonCompleted, parseProgress, setSolved } from './progress-data';

describe('parseProgress', () => {
  it('upgrades v1: a solved id is its first variant solved', () => {
    const v1 = { v: 1, lessons: { 'five-blocks': { read: true, solved: ['four', 'six'] }, tiles: { solved: [] } } };
    expect(parseProgress(JSON.stringify(v1))).toEqual({
      v: 2,
      lessons: { 'five-blocks': { read: true, solved: { four: [0], six: [0] } }, tiles: { solved: {} } },
    });
  });

  it('keeps v2 as stored', () => {
    const v2 = { v: 2, lessons: { tiles: { solved: { a: [0, 2] } } } };
    expect(parseProgress(JSON.stringify(v2))).toEqual(v2);
  });

  it.each([null, '', 'not json', '[]', '{"v":3,"lessons":{}}', '{"v":1}', '{"v":2,"lessons":[]}'])(
    'reads %j as empty',
    (raw) => {
      expect(parseProgress(raw)).toEqual({ v: 2, lessons: {} });
    },
  );
});

describe('completion', () => {
  const e = { read: true as const, solved: { a: [0, 1, 2], b: [2, 0] } };

  it('needs every variant of a set', () => {
    expect(setSolved(e, 'a', 3)).toBe(true);
    expect(setSolved(e, 'b', 3)).toBe(false);
    expect(setSolved(undefined, 'a', 3)).toBe(false);
  });

  it('needs the lesson read and every set solved', () => {
    expect(lessonCompleted(e, { a: 3 })).toBe(true);
    expect(lessonCompleted(e, { a: 3, b: 3 })).toBe(false);
    expect(lessonCompleted({ ...e, read: undefined }, { a: 3 })).toBe(false);
  });
});
