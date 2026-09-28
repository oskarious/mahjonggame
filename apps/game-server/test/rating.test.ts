import { describe, expect, it } from 'vitest';
import { botElo } from '@mahjong/engine';
import { clampHints, hintLevelForRating, ratingChanges } from '../src/rating.ts';
import { TEST_CONFIG } from './helpers.ts';

const seat = (rating: number, points: number, o: { games?: number; bot?: boolean } = {}) => ({
  rating,
  points,
  games: o.games ?? 50,
  bot: o.bot ?? false,
});

describe('ratingChanges', () => {
  it('rewards a win against stronger opponents more', () => {
    const vsStrong = ratingChanges([seat(1000, 40000), seat(1200, 20000), seat(1200, 20000), seat(1200, 20000)], TEST_CONFIG);
    const vsEqual = ratingChanges([seat(1000, 40000), seat(1000, 20000), seat(1000, 20000), seat(1000, 20000)], TEST_CONFIG);
    expect(vsStrong[0]).toBeGreaterThan(vsEqual[0]);
    expect(vsEqual[0]).toBeGreaterThan(0);
  });

  it('is zero-sum among established humans', () => {
    const d = ratingChanges([seat(1100, 35000), seat(1050, 31000), seat(1300, 20000), seat(1000, 14000)], TEST_CONFIG);
    expect(d[0]).toBeGreaterThan(0);
    expect(d[3]).toBeLessThan(0);
    expect(Math.abs(d.reduce((a, b) => a + b, 0))).toBeLessThanOrEqual(2);
  });

  it('scores ties as draws', () => {
    const d = ratingChanges([seat(1000, 25000), seat(1000, 25000), seat(1000, 30000), seat(1000, 20000)], TEST_CONFIG);
    expect(d[0]).toBe(d[1]);
    // First and second each beat the last and lose to the winner: net zero.
    expect(d[0]).toBe(0);
    expect(d[2]).toBeGreaterThan(0);
    expect(d[3]).toBeLessThan(0);
  });

  it('moves new players faster', () => {
    const [fresh] = ratingChanges([seat(1000, 40000, { games: 0 }), seat(1000, 20000), seat(1000, 20000), seat(1000, 20000)], TEST_CONFIG);
    const [old] = ratingChanges([seat(1000, 40000, { games: 20 }), seat(1000, 20000), seat(1000, 20000), seat(1000, 20000)], TEST_CONFIG);
    // Three wins at even odds: K/3 × 3 × 0.5 = K/2.
    expect(old).toBe(10);
    expect(fresh).toBe(20);
  });

  it('leaves bots unchanged and rates humans against the bots', () => {
    const bot = botElo(0.3);
    const d = ratingChanges([seat(1000, 40000), seat(bot, 20000, { bot: true }), seat(bot, 20000, { bot: true }), seat(bot, 20000, { bot: true })], TEST_CONFIG);
    expect(d[1]).toBe(0);
    expect(d[2]).toBe(0);
    expect(d[3]).toBe(0);
    // A win against three bots rated above 1000: more than the 10 for beating equals.
    expect(d[0]).toBeGreaterThan(10);
  });
});

describe('hints by rating', () => {
  it('follows the thresholds', () => {
    expect(hintLevelForRating(1000, TEST_CONFIG)).toBe('waits');
    expect(hintLevelForRating(1099, TEST_CONFIG)).toBe('waits');
    expect(hintLevelForRating(1100, TEST_CONFIG)).toBe('distance');
    expect(hintLevelForRating(1299, TEST_CONFIG)).toBe('distance');
    expect(hintLevelForRating(1300, TEST_CONFIG)).toBe('off');
  });

  it('can only be lowered by the client', () => {
    expect(clampHints('waits', 'full')).toBe('waits');
    expect(clampHints('waits', 'off')).toBe('off');
    expect(clampHints('off', 'waits')).toBe('off');
    expect(clampHints('distance', 'distance')).toBe('distance');
  });
});
