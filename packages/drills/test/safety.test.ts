import { describe, expect, it } from 'vitest';
import { kindOf, parseTiles } from '@mahjong/engine';
import { buildPosition } from '../src/position.ts';
import { noChance, safetyGrades } from '../src/safety.ts';
import type { Position } from '../src/types.ts';

const k = (t: string) => kindOf(parseTiles(t)[0]);
const grades = (p: Position, passed: string[] = []) => {
  const g = safetyGrades(buildPosition(p), 2, passed.map(k));
  return (t: string) => g.get(k(t));
};
// Seat 2 (across) is in riichi; seat 0 is on turn. The dora indicator is 3z unless set.
const base = (discards: string, hand = '123m456p789s11z2z3z', extra: (string | undefined)[] = []): Position => ({
  hands: [hand],
  discards: [extra[0], extra[1], discards, extra[3]],
  riichi: [2],
  dealer: 3,
  turn: 0,
  draws: '8p',
});

describe('safety grades', () => {
  it('ranks the riichi player’s own discards and passed tiles as genbutsu', () => {
    const g = grades(base('9m4p', undefined, [undefined, '7s']), ['7s']);
    expect(g('9m')).toEqual({ grade: 1, reason: 'genbutsu' });
    expect(g('7s')).toEqual({ grade: 1, reason: 'genbutsu' });
  });

  it('makes 1 and 7 suji of a discarded 4, terminals safest', () => {
    const g = grades(base('4p'));
    expect(g('1p')).toEqual({ grade: 2, reason: 'suji' });
    expect(g('7p')).toEqual({ grade: 4, reason: 'suji' });
  });

  it('gives 3 and 9 one side only (a 1-2 shape is an edge wait)', () => {
    const g = grades(base('6p'));
    expect(g('3p')).toEqual({ grade: 4, reason: 'suji' });
    expect(g('9p')).toEqual({ grade: 2, reason: 'suji' });
  });

  it('needs both sides for a middle tile', () => {
    const half = grades(base('2p'));
    expect(half('5p')).toEqual({ grade: 7, reason: 'half-suji' });
    const both = grades(base('2p8p'));
    expect(both('5p')).toEqual({ grade: 3, reason: 'suji' });
    expect(grades(base('1z'))('5p')).toEqual({ grade: 8, reason: 'open' });
  });

  it('grades by rank without suji', () => {
    const g = grades(base('1z'));
    expect([g('1s')?.grade, g('2s')?.grade, g('3s')?.grade, g('4s')?.grade]).toEqual([5, 6, 7, 8]);
  });

  it('turns a wall of four into no-chance, of three into one-chance', () => {
    const four = grades(base('1z', '77m123p456p789s1z', [undefined, '77m']));
    expect(four('8m')).toEqual({ grade: 2, reason: 'no-chance' });
    expect(four('9m')).toEqual({ grade: 2, reason: 'no-chance' });
    // 6m: (7m, 8m) is walled, but (4m, 5m) is open.
    expect(four('6m')).toEqual({ grade: 8, reason: 'open' });
    const three = grades(base('1z', '77m123p456p789s1z', [undefined, '7m']));
    expect(three('8m')).toEqual({ grade: 4, reason: 'one-chance' });
  });

  it('grades honors by the copies the reader cannot see', () => {
    const g = grades(base('9m', '123m456p789s1z2z55z', [undefined, '2z2z', undefined, '5z5z']));
    // 1z: three unseen; 2z: one unseen; 5z: none left.
    expect(g('1z')).toEqual({ grade: 5, reason: 'honor-3' });
    expect(g('2z')).toEqual({ grade: 3, reason: 'honor-1' });
    expect(g('5z')).toEqual({ grade: 2, reason: 'honor-gone' });
  });

  it('lists no-chance tiles across the board', () => {
    const g = buildPosition(base('1z', '77m123p456p789s1z', [undefined, '77m']));
    expect(noChance(g).filter((x) => x < 9)).toEqual([k('8m'), k('9m')]);
  });
});
