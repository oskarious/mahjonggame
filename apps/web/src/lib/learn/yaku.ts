// The yaku list page: every yaku and yakuman the engine scores, with an example hand each. The lesson test scores
// every example with the engine and checks the han claimed here (closed, and open where an open example is given).
import {
  type HandValue,
  type MeldType,
  type WinContext,
  type YakuId,
  type YakumanId,
  EAST,
  SOUTH,
  makeMeld,
  parseTiles,
  scoreHand,
} from '@mahjong/engine';
import { LESSON_RULES } from '@mahjong/drills/position';

export interface YakuExample {
  /** Concealed tiles, the winning tile last. */
  hand: string;
  /** Called (or concealed-quad) melds. */
  melds?: [MeldType, string][];
  /** Win conditions; default: non-dealer South seat, East round, ron, no riichi, no dora. */
  ctx?: Partial<
    Pick<
      WinContext,
      | 'tsumo'
      | 'riichi'
      | 'ippatsu'
      | 'rinshan'
      | 'chankan'
      | 'haitei'
      | 'houtei'
      | 'tenhou'
      | 'chiihou'
      | 'renhou'
      | 'dealer'
    >
  >;
}

export interface YakuEntry {
  id: YakuId | YakumanId;
  yakuman?: boolean;
  /** Japanese name in romaji. */
  name: string;
  english: string;
  /** Han when closed (yakuman: 13, shown as "Yakuman"). */
  han: number;
  /** Han when open; null = closed hands only. */
  open: number | null;
  rule: string;
  example: YakuExample;
  /** For yaku worth less when open: an open hand that has it. */
  openExample?: YakuExample;
}

const Y = (e: YakuEntry) => e;

export const YAKU_LIST: YakuEntry[] = [
  // 1 han
  Y({ id: 'riichi', name: 'Riichi', english: 'Ready hand', han: 1, open: null, rule: 'Declare it when your closed hand is in tenpai, and put up 1000 points.', example: { hand: '123m456p789s11z23s4s', ctx: { riichi: 'riichi' } } }),
  Y({ id: 'ippatsu', name: 'Ippatsu', english: 'One shot', han: 1, open: null, rule: 'Win within one go-around after riichi, before any call.', example: { hand: '123m456p789s11z23s4s', ctx: { riichi: 'riichi', ippatsu: true } } }),
  Y({ id: 'menzenTsumo', name: 'Menzen tsumo', english: 'Self-draw', han: 1, open: null, rule: 'Win by self-draw with a closed hand.', example: { hand: '123m456p789s11z23s4s', ctx: { tsumo: true } } }),
  Y({ id: 'pinfu', name: 'Pinfu', english: 'No-points hand', han: 1, open: null, rule: 'Four sequences, a pair that is not a value tile, and a two-sided wait.', example: { hand: '123m456p789s55m23s4s' } }),
  Y({ id: 'iipeikou', name: 'Iipeikou', english: 'Pure double sequence', han: 1, open: null, rule: 'Two identical sequences in a closed hand.', example: { hand: '112233m456p55m78s9s' } }),
  Y({ id: 'tanyao', name: 'Tanyao', english: 'All simples', han: 1, open: 1, rule: 'Only tiles 2 to 8: no terminals, no honors.', example: { hand: '234m456p678s55m23s4s' } }),
  Y({ id: 'yakuhaiWhite', name: 'Haku', english: 'White dragon', han: 1, open: 1, rule: 'A triplet of white dragons.', example: { hand: '555z123m456p78s99s6s' } }),
  Y({ id: 'yakuhaiGreen', name: 'Hatsu', english: 'Green dragon', han: 1, open: 1, rule: 'A triplet of green dragons.', example: { hand: '666z123m456p78s99s6s' } }),
  Y({ id: 'yakuhaiRed', name: 'Chun', english: 'Red dragon', han: 1, open: 1, rule: 'A triplet of red dragons.', example: { hand: '777z123m456p78s99s6s' } }),
  Y({ id: 'seatWind', name: 'Jikaze', english: 'Seat wind', han: 1, open: 1, rule: 'A triplet of your own seat wind.', example: { hand: '222z123m456p78s99s6s' } }),
  Y({ id: 'roundWind', name: 'Bakaze', english: 'Round wind', han: 1, open: 1, rule: 'A triplet of the round wind.', example: { hand: '111z123m456p78s99s6s' } }),
  Y({ id: 'rinshan', name: 'Rinshan kaihou', english: 'After a quad', han: 1, open: 1, rule: 'Win on the replacement tile drawn after declaring a quad.', example: { hand: '123m456p78s99s6s', melds: [['daiminkan', '1111p']], ctx: { tsumo: true, rinshan: true } } }),
  Y({ id: 'chankan', name: 'Chankan', english: 'Robbing a quad', han: 1, open: 1, rule: 'Win by ron on the tile another player adds to a pon to make a quad.', example: { hand: '123m456p789s11z23s4s', ctx: { chankan: true } } }),
  Y({ id: 'haitei', name: 'Haitei raoyue', english: 'Under the sea', han: 1, open: 1, rule: 'Win by self-draw on the last tile of the wall.', example: { hand: '123m456p789s11z23s4s', ctx: { tsumo: true, haitei: true } } }),
  Y({ id: 'houtei', name: 'Houtei raoyui', english: 'Under the river', han: 1, open: 1, rule: 'Win by ron on the very last discard.', example: { hand: '123m456p789s11z23s4s', ctx: { houtei: true } } }),
  // 2 han
  Y({ id: 'doubleRiichi', name: 'Daburu riichi', english: 'Double riichi', han: 2, open: null, rule: 'Riichi on your very first discard, before any call (replaces riichi).', example: { hand: '123m456p789s11z23s4s', ctx: { riichi: 'double' } } }),
  Y({ id: 'chiitoitsu', name: 'Chiitoitsu', english: 'Seven pairs', han: 2, open: null, rule: 'Seven different pairs. Always 25 fu.', example: { hand: '1133m5577p2266s4z4z' } }),
  Y({ id: 'sanshokuDoujun', name: 'Sanshoku doujun', english: 'Mixed triple sequence', han: 2, open: 1, rule: 'The same sequence in all three suits.', example: { hand: '123m123p78p123s55m9p' }, openExample: { hand: '123p78p123s55m9p', melds: [['chii', '123m']] } }),
  Y({ id: 'ittsu', name: 'Ittsu', english: 'Pure straight', han: 2, open: 1, rule: '1-2-3, 4-5-6 and 7-8-9 in one suit.', example: { hand: '123456789m45p11s6p' }, openExample: { hand: '456789m45p11s6p', melds: [['chii', '123m']] } }),
  Y({ id: 'chanta', name: 'Chanta', english: 'Half outside hand', han: 2, open: 1, rule: 'Every set and the pair contain a terminal or an honor, with at least one honor.', example: { hand: '123m789p789s11z12s3s' }, openExample: { hand: '789p789s11z12s3s', melds: [['chii', '123m']] } }),
  Y({ id: 'sanshokuDoukou', name: 'Sanshoku doukou', english: 'Triple triplets', han: 2, open: 2, rule: 'Triplets of the same number in all three suits.', example: { hand: '222m222p222s34m55p5m' } }),
  Y({ id: 'sanankou', name: 'Sanankou', english: 'Three concealed triplets', han: 2, open: 2, rule: 'Three triplets you made yourself, without calling.', example: { hand: '111m444p777s23s99m4s' } }),
  Y({ id: 'sankantsu', name: 'Sankantsu', english: 'Three quads', han: 2, open: 2, rule: 'Three quads, open or concealed.', example: { hand: '55z78p9p', melds: [['ankan', '1111m'], ['ankan', '2222p'], ['daiminkan', '3333s']] } }),
  Y({ id: 'toitoi', name: 'Toitoi', english: 'All triplets', han: 2, open: 2, rule: 'Four triplets (or quads) and a pair.', example: { hand: '777s99m11z1z', melds: [['pon', '222m'], ['pon', '555p']] } }),
  Y({ id: 'shousangen', name: 'Shousangen', english: 'Little three dragons', han: 2, open: 2, rule: 'Two dragon triplets and a pair of the third dragon.', example: { hand: '555z666z77z123m45p6p' } }),
  Y({ id: 'honroutou', name: 'Honroutou', english: 'All terminals and honors', han: 2, open: 2, rule: 'Only 1s, 9s and honors.', example: { hand: '111m999p111s22z99s9s' } }),
  // 3 han and more
  Y({ id: 'ryanpeikou', name: 'Ryanpeikou', english: 'Twice pure double sequence', han: 3, open: null, rule: 'Two pairs of identical sequences (replaces iipeikou).', example: { hand: '112233m55667p99s7p' } }),
  Y({ id: 'honitsu', name: 'Honitsu', english: 'Half flush', han: 3, open: 2, rule: 'One suit plus honors.', example: { hand: '234567m99m555z78m9m' }, openExample: { hand: '234567m99m78m9m', melds: [['pon', '555z']] } }),
  Y({ id: 'junchan', name: 'Junchan', english: 'Full outside hand', han: 3, open: 2, rule: 'Every set and the pair contain a 1 or a 9; no honors.', example: { hand: '123789m123p78s99s9s' }, openExample: { hand: '123789m78s99s9s', melds: [['chii', '123p']] } }),
  Y({ id: 'chinitsu', name: 'Chinitsu', english: 'Full flush', han: 6, open: 5, rule: 'Every tile from one suit, no honors.', example: { hand: '123m345m567m78m11m9m' }, openExample: { hand: '345m567m78m11m9m', melds: [['chii', '123m']] } }),
  Y({ id: 'renhou', name: 'Renhou', english: 'Blessing of man', han: 5, open: null, rule: 'Ron before your first draw, with no call made yet. A mangan on Riichi Arena.', example: { hand: '123m456p789s11z23s4s', ctx: { renhou: true } } }),
  // Yakuman
  Y({ id: 'kokushi', yakuman: true, name: 'Kokushi musou', english: 'Thirteen orphans', han: 13, open: null, rule: 'One of each terminal and honor, plus one more of any of them.', example: { hand: '19m19p19s1234567z1m' } }),
  Y({ id: 'chuuren', yakuman: true, name: 'Chuuren poutou', english: 'Nine gates', han: 13, open: null, rule: '1112345678999 in one suit plus any tile of that suit.', example: { hand: '1112345678999m5m' } }),
  Y({ id: 'suuankou', yakuman: true, name: 'Suuankou', english: 'Four concealed triplets', han: 13, open: null, rule: 'Four triplets made without calling (a ron on a triplet wait does not count).', example: { hand: '111m444p777s99m22z2z', ctx: { tsumo: true } } }),
  Y({ id: 'daisangen', yakuman: true, name: 'Daisangen', english: 'Big three dragons', han: 13, open: 13, rule: 'Triplets of all three dragons.', example: { hand: '555z666z777z123m5p5p' } }),
  Y({ id: 'shousuushii', yakuman: true, name: 'Shousuushii', english: 'Little four winds', han: 13, open: 13, rule: 'Three wind triplets and a pair of the fourth wind.', example: { hand: '111z222z333z123m4z4z' } }),
  Y({ id: 'daisuushii', yakuman: true, name: 'Daisuushii', english: 'Big four winds', han: 13, open: 13, rule: 'Triplets of all four winds.', example: { hand: '111z222z333z5m5m', melds: [['pon', '444z']] } }),
  Y({ id: 'tsuuiisou', yakuman: true, name: 'Tsuuiisou', english: 'All honors', han: 13, open: 13, rule: 'Only winds and dragons.', example: { hand: '111z222z555z666z7z7z' } }),
  Y({ id: 'chinroutou', yakuman: true, name: 'Chinroutou', english: 'All terminals', han: 13, open: 13, rule: 'Only 1s and 9s.', example: { hand: '111m999m111p99p11s9p' } }),
  Y({ id: 'ryuuiisou', yakuman: true, name: 'Ryuuiisou', english: 'All green', han: 13, open: 13, rule: 'Only 2, 3, 4, 6 and 8 of bamboo and green dragons.', example: { hand: '234s234s666s66z88s8s' } }),
  Y({ id: 'suukantsu', yakuman: true, name: 'Suukantsu', english: 'Four quads', han: 13, open: 13, rule: 'Four quads, open or concealed.', example: { hand: '5z5z', melds: [['ankan', '1111m'], ['daiminkan', '2222p'], ['daiminkan', '3333s'], ['daiminkan', '4444s']] } }),
  Y({ id: 'tenhou', yakuman: true, name: 'Tenhou', english: 'Blessing of heaven', han: 13, open: null, rule: 'The dealer wins on the starting hand.', example: { hand: '123m456p789s11z23s4s', ctx: { tsumo: true, dealer: true, tenhou: true } } }),
  Y({ id: 'chiihou', yakuman: true, name: 'Chiihou', english: 'Blessing of earth', han: 13, open: null, rule: 'A non-dealer wins by self-draw on their first draw, with no call made yet.', example: { hand: '123m456p789s11z23s4s', ctx: { tsumo: true, chiihou: true } } }),
];

/** Scores an example with the engine (null: no yaku or incomplete). */
export function scoreExample(e: YakuExample): HandValue | null {
  const used = new Set<number>();
  const melds = (e.melds ?? []).map(([type, s]) => makeMeld(type, parseTiles(s, used), 3));
  const concealed = parseTiles(e.hand, used);
  const c = e.ctx ?? {};
  return scoreHand(
    {
      concealed,
      melds,
      winTile: concealed[concealed.length - 1],
      tsumo: c.tsumo ?? false,
      seatWind: c.dealer ? EAST : SOUTH,
      roundWind: EAST,
      dealer: c.dealer ?? false,
      riichi: c.riichi ?? 'none',
      ippatsu: c.ippatsu ?? false,
      rinshan: c.rinshan ?? false,
      chankan: c.chankan ?? false,
      haitei: c.haitei ?? false,
      houtei: c.houtei ?? false,
      tenhou: c.tenhou ?? false,
      chiihou: c.chiihou ?? false,
      renhou: c.renhou ?? false,
      doraIndicators: [],
      uraIndicators: [],
    },
    LESSON_RULES,
  );
}

/** The han an example's yaku is worth in it (13 for a yakuman), or 0 if the engine does not find it. */
export function hanIn(entry: YakuEntry, e: YakuExample): number {
  const v = scoreExample(e);
  if (!v) return 0;
  if (entry.yakuman) return v.yakuman.some((y) => y.id === entry.id) ? 13 : 0;
  return v.yaku.find((y) => y.id === entry.id)?.han ?? 0;
}

/** A yaku's value as the yaku list states it: "2 han (1 open)", "1 han, closed only", "Yakuman". */
export const yakuValue = (y: YakuEntry) =>
  y.yakuman
    ? 'Yakuman'
    : y.id === 'renhou'
      ? 'Mangan'
      : y.open === null
        ? `${y.han} han, closed only`
        : y.open === y.han
          ? `${y.han} han`
          : `${y.han} han (${y.open} open)`;

/** What a yaku tooltip can name: any listed yaku, or yakuhai (the dragon and wind triplets) as one. */
export type YakuTipId = YakuEntry['id'] | 'yakuhai';

/** The text of a yaku tooltip, and the yaku list anchor it links to. */
export function yakuTip(id: YakuTipId): {
  name: string;
  english: string;
  value: string;
  rule: string;
  anchor: string;
} {
  if (id === 'yakuhai')
    return {
      name: 'Yakuhai',
      english: 'Value tiles',
      value: '1 han per triplet',
      rule: 'A triplet of any dragon, your seat wind or the round wind.',
      anchor: 'yakuhaiWhite',
    };
  const y = YAKU_LIST.find((e) => e.id === id);
  if (!y) throw new Error(`no yaku ${id}`);
  return {
    name: y.name,
    english: y.english,
    value: yakuValue(y),
    rule: y.rule,
    anchor: y.id,
  };
}
