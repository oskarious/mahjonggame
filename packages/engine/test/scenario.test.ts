import { describe, expect, it } from 'vitest';
import { kindOf, parseTiles, scenario, tileToString } from '../src/index.ts';

const kinds = (s: string) => parseTiles(s).map(kindOf).sort((a, b) => a - b);
const handKinds = (tiles: number[]) => tiles.map(kindOf).sort((a, b) => a - b);

describe('scenario', () => {
  it('builds the described position', () => {
    const g = scenario({ hands: ['123m456p789s1122z'], draws: '3z', dora: '4p' });
    const me = g.hand.players[0];
    expect(g.phase).toBe('playing');
    expect(g.hand.step).toEqual({ type: 'turn', seat: 0, afterCall: false, rinshan: false });
    expect(tileToString(me.drawn!)).toBe('3z');
    expect(handKinds(me.hand)).toEqual(kinds('123m456p789s1122z3z'));
    expect(tileToString(g.hand.doraIndicators[0])).toBe('4p');
    expect(g.hand.doraRevealed).toBe(1);
    for (const s of [1, 2, 3]) expect(g.hand.players[s].hand).toHaveLength(13);
  });

  it('uses every physical tile exactly once', () => {
    const g = scenario({ hands: ['123m456p789s1122z'], discards: [undefined, '19m'], draws: '3z ? 5p' });
    const h = g.hand;
    const all = [
      ...h.wall,
      ...h.rinshan,
      ...h.doraIndicators,
      ...h.uraIndicators,
      ...h.deadExtra,
      ...h.players.flatMap((p) => [...p.hand, ...p.discards.map((d) => d.tile), ...p.melds.flatMap((m) => m.tiles)]),
    ];
    expect(new Set(all).size).toBe(136);
    expect(all).toHaveLength(136);
    expect([h.doraIndicators.length, h.uraIndicators.length, h.rinshan.length]).toEqual([5, 5, 4]);
  });

  it('is deterministic', () => {
    const o = { hands: ['123m456p789s1122z'], melds: [[], [['pon', '777z']]] as never, riichi: [2], draws: '3z' };
    expect(scenario(o)).toEqual(scenario(o));
  });

  it('rejects a hand too large for its melds', () => {
    expect(() => scenario({ hands: [undefined, '12345678912m'], melds: [[], [['pon', '777z']]] })).toThrow(
      'Seat 1 has 11 tiles, expected 10',
    );
  });

  it('rejects a fifth copy, counting red fives', () => {
    expect(() => scenario({ hands: ['111m'], discards: [undefined, '11m'] })).toThrow(/Too many copies of 1m/);
    expect(() => scenario({ hands: ['0555m'], draws: '5m' })).toThrow(/Too many copies/);
    expect(() => scenario({ hands: ['5555m'], draws: '0m' })).toThrow(/Too many copies/);
  });
});
