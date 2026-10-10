import { describe, expect, it } from 'vitest';
import { Matchmaker, type QueueEntry } from '../src/matchmaking.ts';
import { TEST_CONFIG } from './helpers.ts';

const entry = (userId: string, rating: number, joinedAt = 0): QueueEntry => ({
  userId,
  name: userId,
  rating,
  games: 0,
  joinedAt,
});
/** A bot player queued for `forUserId`, whose window counts from that human's `joinedAt`. */
const botEntry = (
  userId: string,
  rating: number,
  forUserId: string,
  windowFrom: number,
  joinedAt = windowFrom,
): QueueEntry => ({
  ...entry(userId, rating, joinedAt),
  bot: { skill: 0.3, forUserId, windowFrom },
});
const humans = (m: { seats: { kind: string; userId: string | null }[] }) =>
  m.seats.flatMap((s) => (s.kind === 'human' ? [s.userId!] : [])).sort();
const bots = (m: { seats: { kind: string; userId: string | null }[] }) =>
  m.seats.flatMap((s) => (s.kind === 'bot' ? [s.userId!] : [])).sort();

describe('Matchmaker', () => {
  it('never fills with anonymous bots: a lone player waits', () => {
    const mm = new Matchmaker(TEST_CONFIG, () => 0.5);
    mm.join(entry('a', 1000), 'east');
    expect(mm.tick(15_000)).toEqual([]);
    expect(mm.tick(10 * 60_000)).toEqual([]);
    expect(mm.formatOf('a')).toBe('east');
  });

  it('seats bot players with the human they joined for, as rated bot seats', () => {
    const mm = new Matchmaker(TEST_CONFIG, () => 0.5);
    mm.join(entry('a', 1000, 0), 'east');
    mm.join(botEntry('x', 1020, 'a', 0, 5_000), 'east');
    mm.join(botEntry('y', 980, 'a', 0, 9_000), 'east');
    expect(mm.tick(9_000)).toEqual([]);
    mm.join(botEntry('z', 1100, 'a', 0, 12_000), 'east');
    const [m] = mm.tick(12_000);
    expect(humans(m)).toEqual(['a']);
    expect(bots(m)).toEqual(['x', 'y', 'z']);
    expect(m.seats.find((s) => s.userId === 'z')).toEqual({
      kind: 'bot',
      skill: 0.3,
      userId: 'z',
      name: 'z',
      rating: 1100,
      games: 0,
    });
    expect(mm.size).toBe(0);
  });

  it('never forms a table of bots only', () => {
    const mm = new Matchmaker(TEST_CONFIG);
    for (const id of ['w', 'x', 'y', 'z']) mm.join(botEntry(id, 1000, 'gone', 0), 'east');
    expect(mm.tick(60_000)).toEqual([]);
    expect(mm.size).toBe(4);
  });

  it('groups close ratings before distant ones', () => {
    const mm = new Matchmaker(TEST_CONFIG);
    mm.join(entry('p1210', 1210, 0), 'east');
    mm.join(entry('p1250', 1250, 1), 'east');
    mm.join(entry('p1900', 1900, 2), 'east');
    mm.join(entry('p1230', 1230, 3), 'east');
    expect(mm.tick(5_000)).toEqual([]);
    expect(
      mm
        .groupFor('p1210', 5_000)
        .map((e) => e.userId)
        .sort(),
    ).toEqual(['p1210', 'p1230', 'p1250']);
    mm.join(botEntry('bot', 1220, 'p1210', 0, 5_000), 'east');
    const [m] = mm.tick(5_000);
    expect(humans(m)).toEqual(['p1210', 'p1230', 'p1250']);
    expect(bots(m)).toEqual(['bot']);
    expect(mm.formatOf('p1900')).toBe('east');
  });

  it('seats humans before bots when both fit', () => {
    const mm = new Matchmaker(TEST_CONFIG);
    mm.join(entry('a', 1000, 0), 'east');
    mm.join(botEntry('x', 1000, 'a', 0), 'east');
    mm.join(botEntry('y', 1000, 'a', 0), 'east');
    mm.join(botEntry('z', 1000, 'a', 0), 'east');
    mm.join(entry('b', 1100, 1), 'east'); // further away in rating than the bots, still within the window
    const [m] = mm.tick(1_000);
    expect(humans(m)).toEqual(['a', 'b']);
    expect(bots(m)).toHaveLength(2);
    expect(mm.size).toBe(1);
  });

  it('widens the window with waiting time; a bot player is as flexible as its human', () => {
    const mm = new Matchmaker(TEST_CONFIG);
    expect(mm.window(0)).toBe(150);
    expect(mm.window(10_000)).toBe(350);
    expect(mm.window(100_000)).toBe(800);
    mm.join(entry('a', 1000, 0), 'south');
    // 300 above: not yet at 5 s (window 250), fine at 10 s (window 350) even though the bot "joined" just now.
    expect(mm.fits('a', 1300, 5_000)).toBe(false);
    expect(mm.fits('a', 1300, 10_000)).toBe(true);
    mm.join(botEntry('x', 1300, 'a', 0, 10_000), 'south');
    expect(mm.groupFor('a', 10_000).map((e) => e.userId)).toEqual(['a', 'x']);
    // A bot that fits the human but not the other bot is not accepted into the group.
    expect(mm.fits('a', 700, 10_000)).toBe(false);
  });

  it('starts four compatible humans immediately', () => {
    const mm = new Matchmaker(TEST_CONFIG);
    for (const [i, r] of [1000, 1050, 1100, 1020].entries()) mm.join(entry(`p${i}`, r, i), 'east');
    const ms = mm.tick(10);
    expect(ms).toHaveLength(1);
    expect(humans(ms[0])).toEqual(['p0', 'p1', 'p2', 'p3']);
    expect(bots(ms[0])).toEqual([]);
  });

  it('keeps formats apart and removes players who leave', () => {
    const mm = new Matchmaker(TEST_CONFIG);
    mm.join(entry('a', 1000), 'east');
    mm.join(entry('b', 1000), 'south');
    mm.join(entry('c', 1000), 'east');
    mm.leave('a');
    expect(mm.formatOf('a')).toBeNull();
    expect(mm.size).toBe(2);
    for (const id of ['x', 'y', 'z']) mm.join(botEntry(id, 1000, 'b', 0), 'south');
    const ms = mm.tick(1_000);
    expect(ms.map((m) => [m.format, humans(m)])).toEqual([['south', ['b']]]);
    expect(mm.formatOf('c')).toBe('east');
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
      for (const id of ['x', 'y', 'z']) mm.join(botEntry(id, 1000, 'a', 0), 'east');
      const [m] = mm.tick(1_000);
      firstSeat.add(m.seats.findIndex((s) => s.kind === 'human'));
    }
    expect(firstSeat.size).toBeGreaterThan(1);
  });
});
