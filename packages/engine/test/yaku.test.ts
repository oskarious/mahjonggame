import { describe, expect, it } from 'vitest';
import { EAST, EMA_2025, NORTH, SOUTH, WEST, makeRules } from '../src/index.ts';
import { hanOf, score, yakuOf, yakumanOf } from './helpers.ts';

// Defaults (see helpers): EMA rules, South seat, east round, non-dealer, win by ron.

/** Closed kanchan hand with no yaku of its own: 123m 456p 789s 55m, 2s-4s waiting on 3s. */
const NO_YAKU = '123m456p789s55m24s3s';
/** Closed pinfu: 123m 456p 789s 55m, 23s waiting on 1s/4s, wins on 4s. */
const PINFU = '123m456p789s55m23s4s';

const openTanyaoOff = makeRules(EMA_2025, { openTanyao: false });

describe('Riichi / Double riichi / Ippatsu', () => {
  it('riichi is 1 han', () => {
    expect(yakuOf(score(NO_YAKU))).toBeNull();
    const v = score(NO_YAKU, { riichi: 'riichi' });
    expect(yakuOf(v)).toEqual(['riichi']);
    expect(v!.han).toBe(1);
  });

  it('double riichi is 2 han and replaces riichi', () => {
    const v = score(NO_YAKU, { riichi: 'double' });
    expect(yakuOf(v)).toEqual(['doubleRiichi']);
    expect(v!.han).toBe(2);
  });

  it('ippatsu needs riichi and combines with double riichi', () => {
    expect(score(NO_YAKU, { ippatsu: true })).toBeNull();
    expect(yakuOf(score(NO_YAKU, { riichi: 'riichi', ippatsu: true }))).toEqual(['ippatsu', 'riichi']);
    expect(score(NO_YAKU, { riichi: 'double', ippatsu: true })!.han).toBe(3);
  });
});

describe('Menzen tsumo (fully concealed hand)', () => {
  it('is 1 han for a closed self-draw', () => {
    expect(yakuOf(score(NO_YAKU, { tsumo: true }))).toEqual(['menzenTsumo']);
  });

  it('does not apply to open hands', () => {
    expect(score('456p789s55m24s3s', { melds: [['chii', '123m']], tsumo: true })).toBeNull();
  });

  it('a concealed quad keeps the hand closed', () => {
    const v = score('456p789s55m24s3s', { melds: [['ankan', '4444z']], tsumo: true });
    expect(yakuOf(v)).toEqual(['menzenTsumo']);
  });
});

describe('Pinfu', () => {
  it('is 1 han, 30 fu by ron', () => {
    const v = score(PINFU);
    expect(yakuOf(v)).toEqual(['pinfu']);
    expect(v!.fu).toBe(30);
  });

  it('is 20 fu by tsumo, combined with menzen tsumo', () => {
    const v = score(PINFU, { tsumo: true });
    expect(yakuOf(v)).toEqual(['menzenTsumo', 'pinfu']);
    expect(v!.fu).toBe(20);
  });

  it('allows a pair of a non-value wind', () => {
    expect(yakuOf(score('123m456p789s44z23s4s'))).toEqual(['pinfu']);
  });

  it('is not possible with a pair of dragons, seat wind or round wind', () => {
    expect(score('123m456p789s55z23s4s')).toBeNull();
    expect(score('123m456p789s22z23s4s')).toBeNull(); // South = seat wind
    expect(score('123m456p789s11z23s4s')).toBeNull(); // East = round wind
    expect(score('123m456p789s44z23s4s', { seatWind: NORTH })).toBeNull();
  });

  it('requires a two-sided wait', () => {
    expect(score('123m456p789s55m12s3s')).toBeNull(); // edge
    expect(score(NO_YAKU)).toBeNull(); // closed
    expect(score('123m456p789s234s5m5m')).toBeNull(); // pair
  });

  it('uses the two-sided reading when the winning tile is ambiguous (EMA 4.1.1)', () => {
    // 56789p + 7p can be 567-789 (edge 7) or 56+7 two-sided.
    const v = score('55m123s789s56789p7p');
    expect(yakuOf(v)).toEqual(['pinfu']);
  });

  it('is closed only', () => {
    expect(score('456p789s55m23s4s', { melds: [['chii', '123m']] })).toBeNull();
  });
});

describe('Iipeikou / Ryanpeikou', () => {
  it('iipeikou is 1 han, closed only, and combines with pinfu', () => {
    expect(yakuOf(score('112233m456p55s78s9s'))).toEqual(['iipeikou', 'pinfu']);
    expect(score('123m456p55s78s9s', { melds: [['chii', '123m']] })).toBeNull();
  });

  it('ryanpeikou is 3 han and replaces iipeikou', () => {
    const v = score('223344m556677p9s9s');
    expect(yakuOf(v)).toEqual(['ryanpeikou']);
    expect(v!.han).toBe(3);
  });

  it('ryanpeikou does not combine with seven pairs; the higher reading wins', () => {
    // Also readable as seven pairs (2 han 25 fu); ryanpeikou 3 han 40 fu scores more.
    expect(yakuOf(score('223344m556677p9s9s'))).not.toContain('chiitoitsu');
    // Full flush: ryanpeikou + chinitsu (9 han) beats seven pairs + chinitsu (8 han).
    expect(yakuOf(score('11223344556699m'))).toEqual(['chinitsu', 'ryanpeikou']);
  });
});

describe('Tanyao', () => {
  it('is 1 han with only simples', () => {
    expect(yakuOf(score('234m456p678s55s23p4p'))).toEqual(['pinfu', 'tanyao']);
  });

  it('counts open unless open tanyao is disabled', () => {
    expect(yakuOf(score('456p678s55s23p4p', { melds: [['chii', '234m']] }))).toEqual(['tanyao']);
    expect(score('456p678s55s23p4p', { melds: [['chii', '234m']], rules: openTanyaoOff })).toBeNull();
  });

  it('fails with any terminal or honour', () => {
    expect(yakuOf(score('123m456p678s55s23p4p'))).toEqual(['pinfu']);
  });
});

describe('Yakuhai', () => {
  it.each([
    ['555z', 'yakuhaiWhite'],
    ['666z', 'yakuhaiGreen'],
    ['777z', 'yakuhaiRed'],
    ['222z', 'seatWind'],
    ['111z', 'roundWind'],
  ])('%s triplet gives %s (1 han, open or closed)', (triplet, id) => {
    expect(yakuOf(score(`${triplet}123m456p99s78s6s`))).toEqual([id]);
    expect(yakuOf(score('123m456p99s78s6s', { melds: [['pon', triplet]] }))).toEqual([id]);
  });

  it('a quad counts like a triplet', () => {
    expect(yakuOf(score('123m456p99s78s6s', { melds: [['daiminkan', '5555z']] }))).toEqual(['yakuhaiWhite']);
  });

  it('double wind (seat and round) is worth 2 han', () => {
    const v = score('111z123m456p99s78s6s', { seatWind: EAST, dealer: true });
    expect(yakuOf(v)).toEqual(['roundWind', 'seatWind']);
    expect(v!.han).toBe(2);
  });

  it('a guest wind triplet is not a yaku', () => {
    expect(score('444z123m456p99s78s6s')).toBeNull();
    expect(yakuOf(score('333z123m456p99s78s6s', { seatWind: WEST, roundWind: SOUTH }))).toEqual(['seatWind']);
  });

  it('two dragon triplets give 2 han', () => {
    expect(score('555z666z123m99s78s6s')!.han).toBe(2);
  });
});

describe('Situational yaku', () => {
  it('rinshan kaihou is 1 han and combines with menzen tsumo', () => {
    const v = score('123m456p99s78s6s', { melds: [['ankan', '4444z']], tsumo: true, rinshan: true });
    expect(yakuOf(v)).toEqual(['menzenTsumo', 'rinshan']);
  });

  it('chankan is 1 han and combines with ippatsu', () => {
    expect(yakuOf(score(NO_YAKU, { chankan: true, riichi: 'riichi', ippatsu: true }))).toEqual([
      'chankan',
      'ippatsu',
      'riichi',
    ]);
  });

  it('haitei is 1 han on the last self-draw, also for open hands', () => {
    expect(yakuOf(score(NO_YAKU, { tsumo: true, haitei: true }))).toEqual(['haitei', 'menzenTsumo']);
    expect(yakuOf(score('456p789s55m24s3s', { melds: [['chii', '123m']], tsumo: true, haitei: true }))).toEqual([
      'haitei',
    ]);
  });

  it('houtei is 1 han on the last discard', () => {
    expect(yakuOf(score(NO_YAKU, { houtei: true }))).toEqual(['houtei']);
  });
});

describe('Chiitoitsu (seven pairs)', () => {
  it('is 2 han, always 25 fu', () => {
    const v = score('11m33m55p77p99s22z6z6z');
    expect(yakuOf(v)).toEqual(['chiitoitsu']);
    expect([v!.han, v!.fu]).toEqual([2, 25]);
  });

  it('does not accept two identical pairs', () => {
    expect(score('1111m33m55p77p99s6z6z')).toBeNull();
  });

  it('combines with tanyao, honitsu, chinitsu and honroutou', () => {
    expect(yakuOf(score('22m44m66p88p33s55s7s7s'))).toEqual(['chiitoitsu', 'tanyao']);
    expect(yakuOf(score('11m33m55m77m99m22z6z6z'))).toEqual(['chiitoitsu', 'honitsu']);
    expect(yakuOf(score('11m33m44m66m77m99m2m2m'))).toEqual(['chiitoitsu', 'chinitsu']);
    const v = score('11m99m11p99p11s22z6z6z');
    expect(yakuOf(v)).toEqual(['chiitoitsu', 'honroutou']);
    expect(v!.han).toBe(4);
  });

  it('combines with riichi, ippatsu, tsumo and haitei', () => {
    expect(yakuOf(score('11m33m55p77p99s22z6z6z', { riichi: 'riichi', ippatsu: true, tsumo: true, haitei: true }))).toEqual([
      'chiitoitsu',
      'haitei',
      'ippatsu',
      'menzenTsumo',
      'riichi',
    ]);
  });

  it('is closed only', () => {
    // Open hands cannot be seven pairs at all: 11 concealed tiles never form seven pairs.
    expect(score('11m33m55p77p99s1z', { melds: [['pon', '222z']] })).toBeNull();
  });
});

describe('Sanshoku doujun (mixed triple sequence)', () => {
  it('is 2 han closed, 1 han open', () => {
    expect(yakuOf(score('234m234p234s44z78s9s'))).toEqual(['pinfu', 'sanshokuDoujun']);
    const open = score('234p234s44z78s9s', { melds: [['chii', '234m']] });
    expect(yakuOf(open)).toEqual(['sanshokuDoujun']);
    expect(open!.han).toBe(1);
  });

  it('needs the same numbers', () => {
    expect(yakuOf(score('234m234p345s44z78s9s'))).toEqual(['pinfu']);
  });
});

describe('Ittsu (pure straight)', () => {
  it('is 2 han closed, 1 han open', () => {
    expect(yakuOf(score('123m456m789m44z23p4p'))).toEqual(['ittsu', 'pinfu']);
    const open = score('123m789m44z23p4p', { melds: [['chii', '456m']] });
    expect(yakuOf(open)).toEqual(['ittsu']);
    expect(open!.han).toBe(1);
  });

  it('must be in one suit', () => {
    expect(yakuOf(score('123m456p789m44z23p4p'))).toEqual(['pinfu']);
  });
});

describe('Chanta / Junchan (outside hands)', () => {
  it('chanta is 2 han closed, 1 han open', () => {
    const v = score('123m789p999s44z12s3s');
    expect(yakuOf(v)).toEqual(['chanta']);
    expect(v!.han).toBe(2);
    expect(hanOf(score('123m789p44z12s3s', { melds: [['pon', '999s']] }), 'chanta')).toBe(1);
  });

  it('junchan is 3 han closed, 2 han open, and replaces chanta', () => {
    const v = score('123m789p999s11p12s3s');
    expect(yakuOf(v)).toEqual(['junchan']);
    expect(v!.han).toBe(3);
    expect(hanOf(score('123m789p11p12s3s', { melds: [['pon', '999s']] }), 'junchan')).toBe(2);
  });

  it('the pair must also be a terminal or honour', () => {
    expect(score('123m789p999s55p12s3s')).toBeNull();
  });

  it('needs at least one sequence (otherwise it is honroutou)', () => {
    const v = score('111m999p111s9s9s', { melds: [['pon', '444z']] });
    expect(yakuOf(v)).toEqual(['honroutou', 'sanankou', 'toitoi']);
  });
});

describe('Sanshoku doukou (triple triplets)', () => {
  it('is 2 han open or closed', () => {
    expect(yakuOf(score('222m222p222s55z78s9s'))).toEqual(['sanankou', 'sanshokuDoukou']);
    const open = score('222p222s44z78s9s', { melds: [['pon', '222m']] });
    expect(yakuOf(open)).toEqual(['sanshokuDoukou']);
    expect(open!.han).toBe(2);
  });
});

describe('Sanankou (three concealed triplets)', () => {
  it('is 2 han', () => {
    expect(yakuOf(score('111m333p555s44z78s9s'))).toEqual(['sanankou']);
  });

  it('a triplet completed by ron is not concealed', () => {
    expect(score('111m333p789s44z55s5s')).toBeNull();
    expect(yakuOf(score('111m333p789s44z55s5s', { tsumo: true }))).toEqual(['menzenTsumo', 'sanankou']);
  });

  it('counts in an open hand and includes concealed quads', () => {
    expect(yakuOf(score('111m333p555s4z4z', { melds: [['chii', '789s']] }))).toEqual(['sanankou']);
    expect(yakuOf(score('333p555s789s4z4z', { melds: [['ankan', '1111m']] }))).toEqual(['sanankou']);
  });
});

describe('Sankantsu / Toitoi', () => {
  it('sankantsu is 2 han', () => {
    const v = score('789s4z4z', {
      melds: [
        ['daiminkan', '1111m'],
        ['daiminkan', '3333p'],
        ['shouminkan', '5555s'],
      ],
    });
    expect(yakuOf(v)).toEqual(['sankantsu']);
  });

  it('toitoi is 2 han and combines with sanankou', () => {
    expect(yakuOf(score('555s888s4z4z', { melds: [['pon', '111m'], ['pon', '333p']] }))).toEqual(['toitoi']);
    // 3 concealed triplets + an open one.
    expect(yakuOf(score('555s888s222p4z4z', { melds: [['pon', '111m']] }))).toEqual(['sanankou', 'toitoi']);
  });
});

describe('Shousangen (little three dragons)', () => {
  it('is 2 han on top of the two dragon triplets', () => {
    const v = score('555z666z77z123m45p6p');
    expect(yakuOf(v)).toEqual(['shousangen', 'yakuhaiGreen', 'yakuhaiWhite']);
    expect(v!.han).toBe(4);
  });
});

describe('Honroutou (all terminals and honours)', () => {
  it('is 2 han and comes with toitoi or chiitoitsu, never chanta', () => {
    expect(hanOf(score('111m999p111s9s9s', { melds: [['pon', '444z']] }), 'honroutou')).toBe(2);
    expect(yakuOf(score('11m99m11p99p11s22z6z6z'))).toContain('honroutou');
  });
});

describe('Honitsu / Chinitsu (flushes)', () => {
  it('honitsu is 3 han closed, 2 han open', () => {
    expect(yakuOf(score('123m456m777m11m44z4z'))).toEqual(['honitsu']);
    expect(hanOf(score('123m456m777m11m44z4z'), 'honitsu')).toBe(3);
    expect(hanOf(score('456m777m11m44z4z', { melds: [['chii', '123m']] }), 'honitsu')).toBe(2);
  });

  it('chinitsu is 6 han closed, 5 han open, and replaces honitsu', () => {
    const v = score('123m456m777m11m23m4m');
    expect(yakuOf(v)).toContain('chinitsu');
    expect(yakuOf(v)).not.toContain('honitsu');
    expect(hanOf(v, 'chinitsu')).toBe(6);
    expect(hanOf(score('456m777m11m23m4m', { melds: [['chii', '123m']] }), 'chinitsu')).toBe(5);
  });
});

describe('Renhou (blessing of man)', () => {
  it('EMA: 5 han that do not combine with other yaku or dora', () => {
    const v = score(NO_YAKU, { renhou: true, dora: '2s' });
    expect(yakuOf(v)).toEqual(['renhou']);
    expect([v!.han, v!.dora, v!.limit]).toEqual([5, 0, 'mangan']);
  });

  it('a hand worth more than mangan is scored normally instead', () => {
    const v = score('123m456m777m11m23m4m', { renhou: true });
    expect(yakuOf(v)).not.toContain('renhou');
    expect(v!.limit).not.toBe('none');
    expect(v!.basePoints).toBeGreaterThan(2000);
  });

  it('can be configured as yakuman or disabled', () => {
    expect(yakumanOf(score(NO_YAKU, { renhou: true, rules: makeRules(EMA_2025, { renhou: 'yakuman' }) }))).toEqual([
      'renhou',
    ]);
    expect(score(NO_YAKU, { renhou: true, rules: makeRules(EMA_2025, { renhou: 'none' }) })).toBeNull();
  });
});

describe('Yakuman', () => {
  it.each([
    ['kokushi', '19m19p19s1234567z1m', {}],
    ['kokushi', '19m19p9s1234567z11s', {}], // single wait
    ['suuankou', '333m222p444p33s88s8s', { tsumo: true }],
    ['suuankou', '111m333p555s777s4z4z', {}], // ron on the pair wait
    ['daisangen', '555z666z777z123m4p4p', {}],
    ['shousuushii', '111z222z333z123m4z4z', {}],
    ['tsuuiisou', '11z22z33z44z55z66z7z7z', {}], // as seven pairs
    ['ryuuiisou', '234s234s666s666z8s8s', {}],
    ['ryuuiisou', '234s234s666s888s4s4s', {}], // green dragon not required
    ['chuuren', '1112345678999m5m', {}],
    ['tenhou', NO_YAKU, { tsumo: true, dealer: true, tenhou: true }],
    ['chiihou', NO_YAKU, { tsumo: true, chiihou: true }],
  ] as const)('%s: %s', (id, hand, opts) => {
    const v = score(hand, opts);
    expect(yakumanOf(v)).toEqual([id]);
    expect([v!.limit, v!.basePoints]).toEqual(['yakuman', 8000]);
  });

  it('open yakuman: daisangen, daisuushii, chinroutou, suukantsu', () => {
    expect(yakumanOf(score('777z123m4p4p', { melds: [['pon', '555z'], ['pon', '666z']] }))).toEqual(['daisangen']);
    expect(yakumanOf(score('333z444z5m5m', { melds: [['pon', '111z'], ['pon', '222z']] }))).toEqual(['daisuushii']);
    expect(yakumanOf(score('111s999s9m9m', { melds: [['pon', '111m'], ['pon', '999p']] }))).toEqual(['chinroutou']);
    const kans = score('5z5z', {
      melds: [
        ['ankan', '1111m'],
        ['daiminkan', '2222p'],
        ['daiminkan', '3333s'],
        ['ankan', '4444z'],
      ],
    });
    expect(yakumanOf(kans)).toEqual(['suukantsu']);
  });

  it('suuankou by ron on a triplet wait is only sanankou + toitoi', () => {
    const v = score('333m222p444p33s88s8s');
    expect(yakumanOf(v)).toEqual([]);
    expect(yakuOf(v)).toEqual(['sanankou', 'tanyao', 'toitoi']);
  });

  it('chuuren needs a closed hand without quads, all-green needs green tiles only', () => {
    expect(yakumanOf(score('1112345678999m5m'.replace('5m', '5p')))).toBeNull();
    expect(yakumanOf(score('234s234s666s555s4s4s'))).toEqual([]);
  });

  it('EMA: yakuman do not stack, ignore dora, and other yaku are dropped', () => {
    const v = score('111z222z555z666z7z7z', { dora: '6z', riichi: 'riichi' });
    expect(v!.yakuman).toHaveLength(1);
    expect([v!.yaku.length, v!.dora, v!.basePoints]).toEqual([0, 0, 8000]);
  });

  it('stacking can be enabled', () => {
    // All honours + four concealed triplets.
    const v = score('111z222z555z666z7z7z', { rules: makeRules(EMA_2025, { multipleYakuman: true }) });
    expect(yakumanOf(v)!.sort()).toEqual(['suuankou', 'tsuuiisou']);
    expect(v!.basePoints).toBe(16000);
  });
});

describe('Dora', () => {
  it('every indicator counts separately', () => {
    expect(score(NO_YAKU, { riichi: 'riichi', dora: '4p' })!.dora).toBe(1);
    expect(score(NO_YAKU, { riichi: 'riichi', dora: '4p4p' })!.dora).toBe(2);
    expect(score(NO_YAKU, { riichi: 'riichi', dora: '4m' })!.dora).toBe(2); // 5m pair
  });

  it('ura dora count only for riichi', () => {
    const hand = '123m456p789s55m24s3s';
    expect(score(hand, { riichi: 'riichi', ura: '4m' })!.uraDora).toBe(2);
    expect(score(hand, { tsumo: true, ura: '4m' })!.uraDora).toBe(0);
  });

  it('dora alone is not a yaku', () => {
    expect(score(NO_YAKU, { dora: '4m' })).toBeNull();
  });

  it('red fives count when enabled', () => {
    const rules = makeRules(EMA_2025, { redFives: { man: 1, pin: 1, sou: 1 } });
    const v = score('234m406p678s22p88s8s', { rules });
    expect([v!.redDora, v!.han]).toEqual([1, 2]);
  });
});
