import type { AbortReason, Limit, YakuId, YakumanId } from '@mahjong/engine';

export const WINDS = ['East', 'South', 'West', 'North'];
export const WIND_SHORT = ['E', 'S', 'W', 'N'];

export const YAKU: Record<YakuId, string> = {
  riichi: 'Riichi',
  doubleRiichi: 'Double riichi',
  ippatsu: 'Ippatsu',
  menzenTsumo: 'Self-draw',
  pinfu: 'Pinfu',
  iipeikou: 'Pure double sequence',
  tanyao: 'All simples',
  yakuhaiWhite: 'White dragon',
  yakuhaiGreen: 'Green dragon',
  yakuhaiRed: 'Red dragon',
  seatWind: 'Seat wind',
  roundWind: 'Round wind',
  rinshan: 'After a quad',
  chankan: 'Robbing a quad',
  haitei: 'Under the sea',
  houtei: 'Under the river',
  chiitoitsu: 'Seven pairs',
  sanshokuDoujun: 'Mixed triple sequence',
  ittsu: 'Pure straight',
  chanta: 'Half outside hand',
  sanshokuDoukou: 'Triple triplets',
  sanankou: 'Three concealed triplets',
  sankantsu: 'Three quads',
  toitoi: 'All triplets',
  shousangen: 'Little three dragons',
  honroutou: 'All terminals & honours',
  ryanpeikou: 'Twice pure double sequence',
  honitsu: 'Half flush',
  junchan: 'Full outside hand',
  renhou: 'Blessing of man',
  chinitsu: 'Full flush',
};

export const YAKUMAN: Record<YakumanId, string> = {
  kokushi: 'Thirteen orphans',
  chuuren: 'Nine gates',
  tenhou: 'Blessing of heaven',
  chiihou: 'Blessing of earth',
  renhou: 'Blessing of man',
  suuankou: 'Four concealed triplets',
  suukantsu: 'Four quads',
  ryuuiisou: 'All green',
  chinroutou: 'All terminals',
  tsuuiisou: 'All honours',
  daisangen: 'Big three dragons',
  shousuushii: 'Little four winds',
  daisuushii: 'Big four winds',
};

export const LIMITS: Record<Limit, string> = {
  none: '',
  mangan: 'Mangan',
  haneman: 'Haneman',
  baiman: 'Baiman',
  sanbaiman: 'Sanbaiman',
  yakuman: 'Yakuman',
};

export const ABORTS: Record<AbortReason, string> = {
  nineTerminals: 'Nine terminals',
  fourWinds: 'Four winds',
  fourRiichi: 'Four riichi',
  fourKans: 'Four quads',
  tripleRon: 'Triple ron',
};

export const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`);
