import { describe, expect, it } from 'vitest';
import { EAST, EMA_2025, type FuPart, limitFor, makeRules, ronPoints, tsumoPoints } from '../src/index.ts';
import { score } from './helpers.ts';

const parts = (hand: string, opts: Parameters<typeof score>[1] = {}) => {
  const v = score(hand, { riichi: 'riichi', ...opts });
  return v!.fuParts.map(({ reason, fu, open }: FuPart) =>
    open === undefined ? `${reason}:${fu}` : `${reason}:${fu}:${open ? 'open' : 'closed'}`,
  );
};
const fu = (hand: string, opts: Parameters<typeof score>[1] = {}) => score(hand, { riichi: 'riichi', ...opts })!.fu;

describe('fu components (EMA 4.1.1)', () => {
  it('base 20 + 10 for a closed ron', () => {
    expect(parts('123m456p789s44z23s4s')).toEqual(['base:20', 'closedRon:10']);
  });

  it('pinfu is exactly 30 by ron and 20 by tsumo (no tsumo fu)', () => {
    expect(fu('123m456p789s44z23s4s')).toBe(30);
    expect(parts('123m456p789s44z23s4s', { tsumo: true })).toEqual(['base:20']);
    expect(fu('123m456p789s44z23s4s', { tsumo: true })).toBe(20);
  });

  it('+2 for tsumo when not pinfu', () => {
    expect(parts('123m456p789s55m24s3s', { tsumo: true })).toEqual(['base:20', 'tsumo:2', 'wait:2']);
    expect(fu('123m456p789s55m24s3s', { tsumo: true })).toBe(30);
  });

  it('open hands get no closed-ron fu; an open 20 fu hand becomes 30', () => {
    const v = score('456p678s55p23s4s', { melds: [['chii', '234m']] });
    expect(v!.fuParts.map((p) => p.reason)).toEqual(['base', 'openPinfu']);
    expect(v!.fu).toBe(30);
  });

  it.each([
    ['melded simple triplet', '123m456p55s78s9s', [['pon', '222p']], 'triplet:2:open'],
    ['concealed simple triplet', '222p123m456p55s78s9s', [], 'triplet:4:closed'],
    ['melded terminal triplet', '123m456p55s78s9s', [['pon', '111p']], 'triplet:4:open'],
    ['concealed honour triplet', '444z123m456p55s78s9s', [], 'triplet:8:closed'],
    ['melded simple quad', '123m456p55s78s9s', [['daiminkan', '2222p']], 'quad:8:open'],
    ['extended quad', '123m456p55s78s9s', [['shouminkan', '2222p']], 'quad:8:open'],
    ['concealed simple quad', '123m456p55s78s9s', [['ankan', '2222p']], 'quad:16:closed'],
    ['melded honour quad', '123m456p55s78s9s', [['daiminkan', '4444z']], 'quad:16:open'],
    ['concealed terminal quad', '123m456p55s78s9s', [['ankan', '9999m']], 'quad:32:closed'],
  ] as const)('%s', (_, hand, melds, expected) => {
    const opts = { melds: melds as never, riichi: 'none' as const, tsumo: true, haitei: true };
    expect(parts(hand, opts)).toContain(expected);
  });

  it('a triplet completed by ron counts as melded; by tsumo as concealed', () => {
    expect(parts('111m333p789s44z55s5s')).toContain('triplet:2:open');
    expect(parts('111m333p789s44z55s5s', { tsumo: true })).toContain('triplet:4:closed');
  });

  it('value pairs: dragons, seat wind, round wind; a double wind pair is 2 fu (EMA) or 4', () => {
    expect(parts('123m456p789s55z23s4s')).toContain('valuePair:2');
    expect(parts('123m456p789s22z23s4s')).toContain('valuePair:2'); // seat
    expect(parts('123m456p789s11z23s4s')).toContain('valuePair:2'); // round
    expect(parts('123m456p789s44z23s4s')).not.toContain('valuePair:2'); // guest wind
    expect(parts('123m456p789s11z23s4s', { seatWind: EAST })).toContain('valuePair:2');
    expect(
      parts('123m456p789s11z23s4s', { seatWind: EAST, rules: makeRules(EMA_2025, { doubleWindPairFu: 4 }) }),
    ).toContain('valuePair:4');
  });

  it('waits: edge, closed and pair waits are 2 fu; two-sided and triplet waits 0', () => {
    expect(parts('123m456p789s55m12s3s')).toContain('wait:2'); // edge
    expect(parts('123m456p789s55m24s3s')).toContain('wait:2'); // closed
    expect(parts('123m456p789s234s5m5m')).toContain('wait:2'); // pair
    expect(parts('123m456p789s55m23s4s')).not.toContain('wait:2'); // two-sided
    expect(parts('123m456p789s55m44s4s')).not.toContain('wait:2'); // triplet
  });

  it('wait fu is awarded even when the hand also waits on other tiles (EMA 4.1.1)', () => {
    // Example 10: 234p 567p 89p waits on 4p/7p (two-sided) and 7p (edge). Winning on 7p is read as edge.
    const v = score('444z11p234p567p89p7p', { tsumo: true });
    expect(v!.wait).toBe('penchan');
    expect(v!.fuParts.map((p) => `${p.reason}:${p.fu}`)).toContain('wait:2');
  });

  it('rounds up to the next 10, except seven pairs (25)', () => {
    expect(fu('111m456p789s55m23s4s')).toBe(40); // 20 + 10 + 8 = 38
    expect(fu('11m33m55p77p99s22z6z6z')).toBe(25);
  });

  it('rinshan counts the tsumo fu', () => {
    const v = score('123m456p99s78s6s', { melds: [['ankan', '4444z']], tsumo: true, rinshan: true });
    expect(v!.fuParts.map((p) => p.reason)).toContain('tsumo');
    expect(v!.fu).toBe(60); // 20 + 2 + 32
  });

  it('the fu parts always add up to the unrounded total', () => {
    for (const [hand, opts] of [
      ['444z11p234p567p89p7p', { tsumo: true }],
      ['111z222z555z123m4p4p', {}],
      ['123m456p789s11z23s4s', { seatWind: EAST, riichi: 'riichi' }],
    ] as const) {
      const v = score(hand, opts)!;
      const raw = v.fuParts.reduce((a, p) => a + p.fu, 0);
      expect(v.fu).toBe(Math.ceil(raw / 10) * 10);
    }
  });
});

describe('payments (EMA scoring tables)', () => {
  const ema = EMA_2025;
  const base = (han: number, fu: number, rules = ema) => limitFor(han, fu, rules)[1];

  it.each([
    [1, 30, 1000],
    [1, 40, 1300],
    [1, 50, 1600],
    [1, 60, 2000],
    [1, 70, 2300],
    [1, 80, 2600],
    [1, 90, 2900],
    [1, 100, 3200],
    [1, 110, 3600],
    [2, 25, 1600],
    [2, 30, 2000],
    [2, 40, 2600],
    [2, 50, 3200],
    [2, 60, 3900],
    [2, 70, 4500],
    [2, 80, 5200],
    [2, 90, 5800],
    [2, 100, 6400],
    [2, 110, 7100],
    [3, 25, 3200],
    [3, 30, 3900],
    [3, 40, 5200],
    [3, 50, 6400],
    [3, 60, 8000],
    [4, 25, 6400],
    [4, 30, 8000],
    [4, 40, 8000],
  ])('non-dealer ron %i han %i fu = %i', (han, fu, points) => {
    expect(ronPoints(base(han, fu), false)).toBe(points);
  });

  it.each([
    [1, 30, 1500],
    [1, 40, 2000],
    [1, 50, 2400],
    [1, 60, 2900],
    [1, 70, 3400],
    [1, 80, 3900],
    [1, 90, 4400],
    [1, 100, 4800],
    [2, 25, 2400],
    [2, 30, 2900],
    [2, 40, 3900],
    [3, 25, 4800],
    [3, 30, 5800],
    [3, 60, 12000],
    [4, 25, 9600],
    [4, 30, 12000],
  ])('dealer ron %i han %i fu = %i', (han, fu, points) => {
    expect(ronPoints(base(han, fu), true)).toBe(points);
  });

  it.each([
    [1, 30, 300, 500],
    [1, 40, 400, 700],
    [2, 20, 400, 700],
    [2, 25, 400, 800],
    [2, 30, 500, 1000],
    [3, 20, 700, 1300],
    [3, 25, 800, 1600],
    [3, 30, 1000, 2000],
    [4, 20, 1300, 2600],
    [4, 25, 1600, 3200],
  ])('non-dealer tsumo %i han %i fu = %i / %i', (han, fu, others, dealer) => {
    expect(tsumoPoints(base(han, fu), false)).toEqual({ fromOthers: others, fromDealer: dealer });
  });

  it.each([
    [1, 30, 500],
    [2, 20, 700],
    [2, 25, 800],
    [2, 30, 1000],
    [3, 20, 1300],
    [3, 25, 1600],
    [4, 20, 2600],
    [4, 25, 3200],
  ])('dealer tsumo %i han %i fu = %i all', (han, fu, each) => {
    expect(tsumoPoints(base(han, fu), true).fromOthers).toBe(each);
  });

  it.each([
    [5, 'mangan', 8000, 12000],
    [6, 'haneman', 12000, 18000],
    [7, 'haneman', 12000, 18000],
    [8, 'baiman', 16000, 24000],
    [10, 'baiman', 16000, 24000],
    [11, 'sanbaiman', 24000, 36000],
    [13, 'sanbaiman', 24000, 36000],
  ])('%i han = %s (%i / %i)', (han, limit, nonDealer, dealer) => {
    const [l, b] = limitFor(han, 30, ema);
    expect(l).toBe(limit);
    expect(ronPoints(b, false)).toBe(nonDealer);
    expect(ronPoints(b, true)).toBe(dealer);
  });

  it('yakuman = 32000 / 48000; kazoe yakuman when enabled', () => {
    expect(ronPoints(8000, false)).toBe(32000);
    expect(ronPoints(8000, true)).toBe(48000);
    expect(limitFor(13, 30, makeRules(ema, { kazoeYakuman: true }))).toEqual(['yakuman', 8000]);
  });

  it('without kiriage mangan, 4 han 30 fu is 7700 / 11600', () => {
    const rules = makeRules(ema, { kiriageMangan: false });
    expect(ronPoints(base(4, 30, rules), false)).toBe(7700);
    expect(ronPoints(base(4, 30, rules), true)).toBe(11600);
    expect(ronPoints(base(3, 60, rules), false)).toBe(7700);
  });
});
