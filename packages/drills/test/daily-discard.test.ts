import { describe, expect, it } from 'vitest';
import { kindOf, seedRng, nextUint32 } from '@mahjong/engine';
import { discardAnswers, stateOf } from '../src/goals.ts';
import { BOT_SHARE, botShare, botWeights, dailyDiscard, discardKinds, pickWeighted } from '../src/daily-discard.ts';

const days = (n: number) =>
  Array.from({ length: n }, (_, i) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10));

describe('daily discard', () => {
  it('is the same hand all day, a different one the next', () => {
    expect(dailyDiscard('2026-10-04')).toEqual(dailyDiscard('2026-10-04'));
    expect(dailyDiscard('2026-10-05').position).not.toEqual(dailyDiscard('2026-10-04').position);
  });

  it('accepts exactly the kinds in the 14-tile hand', () => {
    for (const date of ['2026-10-04', '2026-10-05', '2026-12-31']) {
      const ex = dailyDiscard(date);
      const hand = stateOf(ex)!.hand.players[0].hand;
      expect(hand).toHaveLength(14);
      expect([...discardKinds(ex)].sort((a, b) => a - b)).toEqual([...new Set(hand.map(kindOf))].sort((a, b) => a - b));
    }
  });

  it('gives bots a daily share in range', () => {
    const shares = days(30).map(botShare);
    for (const s of shares) {
      expect(s).toBeGreaterThanOrEqual(BOT_SHARE[0]);
      expect(s).toBeLessThan(BOT_SHARE[1]);
    }
    expect(new Set(shares).size).toBeGreaterThan(1);
  });

  it('weights every kind in the hand, and picks by weight', () => {
    const ex = dailyDiscard('2026-10-04');
    const w = botWeights(ex, '2026-10-04');
    expect(new Set(w.map((x) => x.kind))).toEqual(discardKinds(ex));
    expect(pickWeighted(w, 0)).toBe(w[0].kind);
    expect(pickWeighted(w, 0.999999)).toBe(w[w.length - 1].kind);
  });

  it('mostly favours the most efficient discard, but not every day', () => {
    const sample = days(40);
    let top = 0;
    for (const date of sample) {
      const ex = dailyDiscard(date);
      const w = botWeights(ex, date);
      const rng = seedRng(date);
      const votes = new Map<number, number>();
      for (let i = 0; i < 400; i++) {
        const k = pickWeighted(w, nextUint32(rng) / 0x100000000);
        votes.set(k, (votes.get(k) ?? 0) + 1);
      }
      const lead = [...votes].sort((a, b) => b[1] - a[1])[0][0];
      // The favourite: the discard that keeps the most improving tiles at the lowest distance.
      if (discardAnswers(ex, stateOf(ex)!).has(lead)) top++;
    }
    expect(top / sample.length).toBeGreaterThan(0.5);
    expect(top).toBeLessThan(sample.length);
  });
});
