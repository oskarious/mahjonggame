import { describe, expect, it } from 'vitest';
import { RANKS, rankForRating } from '../src/index.ts';

const label = (rating: number) => rankForRating(rating).label;

describe('rank table', () => {
  it('matches the spec', () => {
    expect(RANKS.map((r) => [r.id, r.name, r.min])).toEqual([
      ['iron', 'Iron', -Infinity],
      ['bronze', 'Bronze', 625],
      ['silver', 'Silver', 875],
      ['gold', 'Gold', 1125],
      ['platinum', 'Platinum', 1375],
      ['diamond', 'Diamond', 1625],
      ['master', 'Master', 1875],
    ]);
  });

  it('is strictly ascending with an unbounded lowest rank', () => {
    expect(RANKS[0].min).toBe(-Infinity);
    for (let i = 1; i < RANKS.length; i++) expect(RANKS[i].min).toBeGreaterThan(RANKS[i - 1].min);
  });
});

describe('rankForRating', () => {
  it.each([
    [700, 'Bronze 2'],
    [625, 'Bronze 1'],
    [624, 'Iron 5'],
    [400, 'Iron 1'],
    [500, 'Iron 3'],
    [924, 'Silver 1'],
    [925, 'Silver 2'],
    [1000, 'Silver 3'],
    [960, 'Silver 2'],
    [980, 'Silver 3'],
    [1124, 'Silver 5'],
    [1132, 'Gold 1'],
    [1875, 'Master 1'],
    [2074, 'Master 4'],
    [2075, 'Master 5'],
    [2400, 'Master 5'],
    [-30, 'Iron 1'],
    [874.6, 'Bronze 5'],
    [1074.5, 'Silver 4'],
    [NaN, 'Iron 1'],
  ])('%s → %s', (rating, expected) => {
    expect(label(rating)).toBe(expected);
  });

  it('returns the rank entry and sub-rank behind the label', () => {
    const r = rankForRating(1000);
    expect(r.rank.id).toBe('silver');
    expect(r.sub).toBe(3);
  });

  it('never goes down as the rating goes up, and every rank has all five sub-ranks', () => {
    const seen = new Map<string, Set<number>>();
    let prev = -1;
    for (let rating = -100; rating <= 2500; rating += 0.5) {
      const { rank, sub } = rankForRating(rating);
      const order = RANKS.indexOf(rank) * 10 + sub;
      expect(order).toBeGreaterThanOrEqual(prev);
      prev = order;
      if (!seen.has(rank.id)) seen.set(rank.id, new Set());
      seen.get(rank.id)!.add(sub);
    }
    expect(seen.size).toBe(RANKS.length);
    for (const subs of seen.values()) expect([...subs].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
