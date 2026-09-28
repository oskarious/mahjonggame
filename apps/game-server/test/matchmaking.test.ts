import { describe, expect, it } from 'vitest';
import { botElo } from '@mahjong/engine';
import { Matchmaker, type QueueEntry } from '../src/matchmaking.ts';
import { TEST_CONFIG } from './helpers.ts';

const entry = (userId: string, rating: number, joinedAt = 0): QueueEntry => ({ userId, name: userId, rating, games: 0, joinedAt });
const humans = (m: { seats: { kind: string; userId?: string }[] }) =>
  m.seats.flatMap((s) => (s.kind === 'human' ? [s.userId!] : [])).sort();
const bots = (m: { seats: { kind: string }[] }) => m.seats.filter((s) => s.kind === 'bot').length;

describe('Matchmaker', () => {
  it('gives a solo player three bots after the fill delay, at a matching strength', () => {
    const mm = new Matchmaker(TEST_CONFIG, () => 0.5);
    mm.join(entry('a', 1000), 'east');
    expect(mm.tick(14_999)).toEqual([]);
    const [m] = mm.tick(15_000);
    expect(m.format).toBe('east');
    expect(humans(m)).toEqual(['a']);
    expect(bots(m)).toBe(3);
    const skill = (m.seats.find((s) => s.kind === 'bot') as { skill: number }).skill;
    expect(Math.round(botElo(skill))).toBe(1000);
    expect(mm.size).toBe(0);
  });

  it('groups close ratings before distant ones', () => {
    const mm = new Matchmaker(TEST_CONFIG);
    mm.join(entry('p1210', 1210, 0), 'east');
    mm.join(entry('p1250', 1250, 1), 'east');
    mm.join(entry('p1900', 1900, 2), 'east');
    mm.join(entry('p1230', 1230, 3), 'east');
    expect(mm.tick(5_000)).toEqual([]);
    const ms = mm.tick(15_000);
    expect(ms).toHaveLength(1);
    expect(humans(ms[0])).toEqual(['p1210', 'p1230', 'p1250']);
    expect(bots(ms[0])).toBe(1);
    expect(mm.formatOf('p1900')).toBe('east');
    const later = mm.tick(15_002);
    expect(humans(later[0])).toEqual(['p1900']);
    expect(bots(later[0])).toBe(3);
  });

  it('widens the window with waiting time', () => {
    const mm = new Matchmaker(TEST_CONFIG);
    expect(mm.window(0)).toBe(150);
    expect(mm.window(10_000)).toBe(350);
    expect(mm.window(100_000)).toBe(800);
    // 300 apart: incompatible at first, compatible once both have waited 7.5 s (150 + 20 × 7.5 = 300).
    mm.join(entry('a', 1000, 0), 'south');
    mm.join(entry('b', 1300, 0), 'south');
    const early = mm.tick(15_000 + 0); // 15 s waited: window 450 → grouped together
    expect(humans(early[0])).toEqual(['a', 'b']);
    const mm2 = new Matchmaker({ ...TEST_CONFIG, fillDelayMs: 5_000 });
    mm2.join(entry('a', 1000, 0), 'south');
    mm2.join(entry('b', 1300, 0), 'south');
    const m2 = mm2.tick(5_000); // window 250 < 300: each starts alone with bots
    expect(m2.map(humans)).toEqual([['a'], ['b']]);
    expect(m2.map(bots)).toEqual([3, 3]);
  });

  it('starts four compatible players immediately', () => {
    const mm = new Matchmaker(TEST_CONFIG);
    for (const [i, r] of [1000, 1050, 1100, 1020].entries()) mm.join(entry(`p${i}`, r, i), 'east');
    const ms = mm.tick(10);
    expect(ms).toHaveLength(1);
    expect(humans(ms[0])).toEqual(['p0', 'p1', 'p2', 'p3']);
    expect(bots(ms[0])).toBe(0);
  });

  it('keeps formats apart and removes players who leave', () => {
    const mm = new Matchmaker(TEST_CONFIG);
    mm.join(entry('a', 1000), 'east');
    mm.join(entry('b', 1000), 'south');
    mm.join(entry('c', 1000), 'east');
    mm.leave('a');
    expect(mm.formatOf('a')).toBeNull();
    expect(mm.size).toBe(2);
    const ms = mm.tick(15_000);
    expect(ms.map((m) => [m.format, humans(m)])).toEqual([
      ['east', ['c']],
      ['south', ['b']],
    ]);
  });

  it('a player is in one queue at a time', () => {
    const mm = new Matchmaker(TEST_CONFIG);
    mm.join(entry('a', 1000, 0), 'east');
    mm.join(entry('a', 1000, 5), 'south');
    expect(mm.size).toBe(1);
    expect(mm.formatOf('a')).toBe('south');
    expect(mm.waitedMs('a', 105)).toBe(100);
  });

  it('shuffles seats', () => {
    const mm = new Matchmaker(TEST_CONFIG);
    const firstSeat = new Set<number>();
    for (let i = 0; i < 40; i++) {
      mm.join(entry('a', 1000, 0), 'east');
      const [m] = mm.tick(15_000);
      firstSeat.add(m.seats.findIndex((s) => s.kind === 'human'));
    }
    expect(firstSeat.size).toBeGreaterThan(1);
  });
});
