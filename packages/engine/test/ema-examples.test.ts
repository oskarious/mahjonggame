import { describe, expect, it } from 'vitest';
import { EAST, EMA_2025, makeRules, ronPoints, tsumoPoints } from '../src/index.ts';
import { score, yakuOf } from './helpers.ts';

const yakuIds = yakuOf;

describe('EMA 2025 scoring examples (section 4.3)', () => {
  it('1: riichi tsumo pinfu pure straight = mangan', () => {
    const v = score('33m123m123s456s78s9s', { tsumo: true, riichi: 'riichi' });
    expect(yakuIds(v)).toEqual(['ittsu', 'menzenTsumo', 'pinfu', 'riichi']);
    expect(v!.han).toBe(5);
    expect(v!.limit).toBe('mangan');
    expect(tsumoPoints(v!.basePoints, false)).toEqual({ fromDealer: 4000, fromOthers: 2000 });
    expect(tsumoPoints(v!.basePoints, true).fromOthers).toBe(4000);
  });

  it('2: same hand by ron = 4 han 30 fu, rounded up to mangan', () => {
    const v = score('33m123m123s456s78s9s', { riichi: 'riichi' });
    expect(yakuIds(v)).toEqual(['ittsu', 'pinfu', 'riichi']);
    expect([v!.han, v!.fu]).toEqual([4, 30]);
    expect(ronPoints(v!.basePoints, false)).toBe(8000);
    expect(ronPoints(v!.basePoints, true)).toBe(12000);
    const noKiriage = score('33m123m123s456s78s9s', {
      riichi: 'riichi',
      rules: makeRules(EMA_2025, { kiriageMangan: false }),
    });
    expect(ronPoints(noKiriage!.basePoints, false)).toBe(7700);
  });

  it('3: open pure straight with dora = 2 han 30 fu (open pinfu fu)', () => {
    const v = score('33m123s123s78s9s', { melds: [['chii', '456s']], dora: '6s' });
    expect(yakuIds(v)).toEqual(['ittsu']);
    expect([v!.han, v!.fu, v!.dora]).toEqual([2, 30, 1]);
    expect(ronPoints(v!.basePoints, true)).toBe(2900);
    expect(ronPoints(v!.basePoints, false)).toBe(2000);
  });

  it('4: four concealed triplets by tsumo = yakuman', () => {
    const v = score('333m222p444p33s88s8s', { tsumo: true });
    expect(v!.yakuman.map((y) => y.id)).toEqual(['suuankou']);
    expect(tsumoPoints(v!.basePoints, false)).toEqual({ fromDealer: 16000, fromOthers: 8000 });
  });

  it('5: same hand by ron = three concealed triplets, all triplets, tanyao, 3 dora = baiman', () => {
    const v = score('333m222p444p33s88s8s', { dora: '3p' });
    expect(yakuIds(v)).toEqual(['sanankou', 'tanyao', 'toitoi']);
    expect([v!.han, v!.dora, v!.limit]).toEqual([8, 3, 'baiman']);
    expect(ronPoints(v!.basePoints, false)).toBe(16000);
    expect(ronPoints(v!.basePoints, true)).toBe(24000);
  });

  it('6: riichi ippatsu tsumo tanyao seven pairs = haneman', () => {
    const v = score('22m33m55m22p66p33s4s4s', { tsumo: true, riichi: 'riichi', ippatsu: true });
    expect(yakuIds(v)).toEqual(['chiitoitsu', 'ippatsu', 'menzenTsumo', 'riichi', 'tanyao']);
    expect(v!.limit).toBe('haneman');
    expect(tsumoPoints(v!.basePoints, false)).toEqual({ fromDealer: 6000, fromOthers: 3000 });
  });

  it('7: seven pairs by ron = 2 han 25 fu', () => {
    const v = score('66z33m55m22p66p33s4s4s');
    expect(yakuIds(v)).toEqual(['chiitoitsu']);
    expect([v!.han, v!.fu]).toEqual([2, 25]);
    expect(ronPoints(v!.basePoints, true)).toBe(2400);
    expect(ronPoints(v!.basePoints, false)).toBe(1600);
  });

  it('8: twice pure double sequence beats seven pairs', () => {
    const v = score('334455m112233p7z7z', { tsumo: true });
    expect(yakuIds(v)).toEqual(['menzenTsumo', 'ryanpeikou']);
    expect([v!.han, v!.fu, v!.limit]).toEqual([4, 30, 'mangan']);
    expect(tsumoPoints(v!.basePoints, true).fromOthers).toBe(4000);
  });

  it('9: dealer half flush with double east and outside hand + dora = haneman', () => {
    const v = score('11s123s789s33z3z', {
      melds: [['pon', '111z']],
      dealer: true,
      seatWind: EAST,
      dora: '6s',
    });
    expect(yakuIds(v)).toEqual(['chanta', 'honitsu', 'roundWind', 'seatWind']);
    expect(v!.han).toBe(6);
    expect(ronPoints(v!.basePoints, true)).toBe(18000);
  });

  it('10: the winning tile is read as an edge wait for more fu', () => {
    const v = score('444z11p234p567p89p7p', { tsumo: true });
    expect(yakuIds(v)).toEqual(['honitsu', 'menzenTsumo']);
    expect([v!.han, v!.fu, v!.wait]).toEqual([4, 40, 'penchan']);
    expect(tsumoPoints(v!.basePoints, false)).toEqual({ fromDealer: 4000, fromOthers: 2000 });
  });
});

