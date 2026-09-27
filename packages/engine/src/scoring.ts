import {
  type Kind,
  type Tile,
  GREEN,
  RED,
  WHITE,
  doraFromIndicator,
  isDragon,
  isHonor,
  isRedTile,
  isSimple,
  isTerminal,
  isTerminalOrHonor,
  isWind,
  kindOf,
  suitOf,
} from './tiles.ts';
import { type Counts, countKinds, decomposeStandard, isChiitoi, isKokushi } from './hand.ts';
import type { RuleSet } from './rules.ts';
import type { Meld } from './types.ts';

export type YakuId =
  | 'riichi'
  | 'doubleRiichi'
  | 'ippatsu'
  | 'menzenTsumo'
  | 'pinfu'
  | 'iipeikou'
  | 'tanyao'
  | 'yakuhaiWhite'
  | 'yakuhaiGreen'
  | 'yakuhaiRed'
  | 'seatWind'
  | 'roundWind'
  | 'rinshan'
  | 'chankan'
  | 'haitei'
  | 'houtei'
  | 'chiitoitsu'
  | 'sanshokuDoujun'
  | 'ittsu'
  | 'chanta'
  | 'sanshokuDoukou'
  | 'sanankou'
  | 'sankantsu'
  | 'toitoi'
  | 'shousangen'
  | 'honroutou'
  | 'ryanpeikou'
  | 'honitsu'
  | 'junchan'
  | 'renhou'
  | 'chinitsu';

export type YakumanId =
  | 'kokushi'
  | 'chuuren'
  | 'tenhou'
  | 'chiihou'
  | 'renhou'
  | 'suuankou'
  | 'suukantsu'
  | 'ryuuiisou'
  | 'chinroutou'
  | 'tsuuiisou'
  | 'daisangen'
  | 'shousuushii'
  | 'daisuushii';

export type Wait = 'ryanmen' | 'kanchan' | 'penchan' | 'tanki' | 'shanpon';

export type FuReason =
  | 'base'
  | 'chiitoitsu'
  | 'closedRon'
  | 'tsumo'
  | 'triplet'
  | 'quad'
  | 'valuePair'
  | 'wait'
  | 'openPinfu';

/** One line of the fu calculation, e.g. { reason: 'triplet', fu: 8, kind: 27, open: false }. */
export interface FuPart {
  reason: FuReason;
  fu: number;
  kind?: Kind;
  open?: boolean;
}
export type Limit = 'none' | 'mangan' | 'haneman' | 'baiman' | 'sanbaiman' | 'yakuman';

export interface WinContext {
  /** Concealed tiles including the winning tile. */
  concealed: Tile[];
  melds: Meld[];
  winTile: Tile;
  tsumo: boolean;
  seatWind: Kind;
  roundWind: Kind;
  dealer: boolean;
  riichi: 'none' | 'riichi' | 'double';
  ippatsu: boolean;
  rinshan: boolean;
  chankan: boolean;
  haitei: boolean;
  houtei: boolean;
  tenhou: boolean;
  chiihou: boolean;
  renhou: boolean;
  /** Revealed dora indicators. */
  doraIndicators: Tile[];
  /** Ura dora indicators under the revealed ones; only counted for riichi hands. */
  uraIndicators: Tile[];
}

export interface HandValue {
  yaku: { id: YakuId; han: number }[];
  yakuman: { id: YakumanId; multiplier: number }[];
  dora: number;
  redDora: number;
  uraDora: number;
  han: number;
  /** Rounded fu (25 for seven pairs). */
  fu: number;
  /** Components that add up to the unrounded fu. */
  fuParts: FuPart[];
  wait: Wait;
  limit: Limit;
  basePoints: number;
}

interface ScoredSet {
  type: 'seq' | 'trip' | 'quad';
  kind: Kind;
  /** Melded for fu/concealed-triplet purposes (a triplet completed by ron counts as melded). */
  open: boolean;
}

interface Candidate {
  yaku: { id: YakuId; han: number }[];
  yakuman: { id: YakumanId; multiplier: number }[];
  fu: number;
  fuParts: FuPart[];
  wait: Wait;
}

const GREEN_KINDS = new Set<Kind>([19, 20, 21, 23, 25, GREEN]);

export const roundUp100 = (x: number) => Math.ceil(x / 100) * 100;

/** Scores a complete hand, picking the highest-scoring interpretation. Null if incomplete or without yaku. */
export function scoreHand(ctx: WinContext, rules: RuleSet): HandValue | null {
  const counts = countKinds(ctx.concealed);
  const winKind = kindOf(ctx.winTile);
  const closed = ctx.melds.every((m) => m.type === 'ankan');
  const allTiles = [...ctx.concealed, ...ctx.melds.flatMap((m) => m.tiles)];
  const kinds = allTiles.map(kindOf);

  const candidates: Candidate[] = [];
  for (const shape of decomposeStandard(counts)) {
    for (const { index, wait } of winPositions(shape.pair, shape.groups, winKind)) {
      const sets: ScoredSet[] = shape.groups.map((g, i) => ({
        type: g.type,
        kind: g.kind,
        open: i === index && g.type === 'trip' && !ctx.tsumo,
      }));
      for (const m of ctx.melds) sets.push(meldSet(m));
      candidates.push(evalStandard(ctx, rules, closed, kinds, counts, sets, shape.pair, wait));
    }
  }
  if (ctx.melds.length === 0 && isChiitoi(counts)) candidates.push(evalChiitoi(ctx, rules, kinds));
  if (ctx.melds.length === 0 && isKokushi(counts)) candidates.push(evalKokushi(ctx, rules, kinds));
  if (!candidates.length) return null;

  let best: HandValue | null = null;
  for (const c of candidates) {
    const v = finalize(c, ctx, rules, allTiles);
    if (v && (!best || isBetter(v, best))) best = v;
  }
  if (ctx.renhou && rules.renhou === 'mangan' && (!best || best.basePoints < 2000)) {
    best = {
      yaku: [{ id: 'renhou', han: 5 }],
      yakuman: [],
      dora: 0,
      redDora: 0,
      uraDora: 0,
      han: 5,
      fu: candidates[0].fu,
      fuParts: candidates[0].fuParts,
      wait: candidates[0].wait,
      limit: 'mangan',
      basePoints: 2000,
    };
  }
  return best;
}

function isBetter(a: HandValue, b: HandValue): boolean {
  if (a.basePoints !== b.basePoints) return a.basePoints > b.basePoints;
  if (a.han !== b.han) return a.han > b.han;
  return a.fu > b.fu;
}

function meldSet(m: Meld): ScoredSet {
  const kind = Math.min(...m.tiles.map(kindOf));
  if (m.type === 'chii') return { type: 'seq', kind, open: true };
  if (m.type === 'pon') return { type: 'trip', kind, open: true };
  return { type: 'quad', kind, open: m.type !== 'ankan' };
}

function winPositions(pair: Kind, groups: { type: 'seq' | 'trip'; kind: Kind }[], winKind: Kind) {
  const res: { index: number; wait: Wait }[] = [];
  if (pair === winKind) res.push({ index: -1, wait: 'tanki' });
  groups.forEach((g, i) => {
    if (g.type === 'trip') {
      if (g.kind === winKind) res.push({ index: i, wait: 'shanpon' });
      return;
    }
    const off = winKind - g.kind;
    if (off === 1) res.push({ index: i, wait: 'kanchan' });
    else if (off === 0) res.push({ index: i, wait: g.kind % 9 === 6 ? 'penchan' : 'ryanmen' });
    else if (off === 2) res.push({ index: i, wait: g.kind % 9 === 0 ? 'penchan' : 'ryanmen' });
  });
  return res;
}

type AddYaku = (id: YakuId, closedHan: number, openHan: number) => void;

function collector(closed: boolean) {
  const yaku: { id: YakuId; han: number }[] = [];
  const yakuman: { id: YakumanId; multiplier: number }[] = [];
  const add: AddYaku = (id, closedHan, openHan) => {
    const han = closed ? closedHan : openHan;
    if (han > 0) yaku.push({ id, han });
  };
  const addYakuman = (id: YakumanId) => yakuman.push({ id, multiplier: 1 });
  return { yaku, yakuman, add, addYakuman };
}

/** Yaku that depend only on the tiles and the situation, not on how the hand is split. */
function commonYaku(
  ctx: WinContext,
  rules: RuleSet,
  closed: boolean,
  kinds: Kind[],
  add: AddYaku,
  addYakuman: (id: YakumanId) => void,
) {
  if (ctx.riichi === 'double') add('doubleRiichi', 2, 0);
  else if (ctx.riichi === 'riichi') add('riichi', 1, 0);
  if (ctx.riichi !== 'none' && ctx.ippatsu) add('ippatsu', 1, 0);
  if (ctx.tsumo) add('menzenTsumo', 1, 0);
  if (kinds.every(isSimple)) add('tanyao', 1, rules.openTanyao ? 1 : 0);
  const suits = new Set(kinds.filter((k) => k < 27).map(suitOf));
  const honors = kinds.some(isHonor);
  if (suits.size === 1) {
    if (honors) add('honitsu', 3, 2);
    else add('chinitsu', 6, 5);
  }
  if (kinds.every(isTerminalOrHonor)) add('honroutou', 2, 2);
  if (ctx.rinshan) add('rinshan', 1, 1);
  if (ctx.chankan) add('chankan', 1, 1);
  if (ctx.haitei) add('haitei', 1, 1);
  if (ctx.houtei) add('houtei', 1, 1);

  if (kinds.every(isHonor)) addYakuman('tsuuiisou');
  if (kinds.every(isTerminal)) addYakuman('chinroutou');
  if (kinds.every((k) => GREEN_KINDS.has(k))) addYakuman('ryuuiisou');
  if (ctx.tenhou) addYakuman('tenhou');
  if (ctx.chiihou) addYakuman('chiihou');
  if (ctx.renhou && rules.renhou === 'yakuman') addYakuman('renhou');
}

function evalStandard(
  ctx: WinContext,
  rules: RuleSet,
  closed: boolean,
  kinds: Kind[],
  counts: Counts,
  sets: ScoredSet[],
  pair: Kind,
  wait: Wait,
): Candidate {
  const { yaku, yakuman, add, addYakuman } = collector(closed);
  commonYaku(ctx, rules, closed, kinds, add, addYakuman);

  const seqs = sets.filter((s) => s.type === 'seq');
  const triplets = sets.filter((s) => s.type !== 'seq');
  const quads = sets.filter((s) => s.type === 'quad');
  const isValue = (k: Kind) => isDragon(k) || k === ctx.seatWind || k === ctx.roundWind;

  const pinfu = closed && seqs.length === 4 && !isValue(pair) && wait === 'ryanmen';
  if (pinfu) add('pinfu', 1, 0);

  if (closed) {
    const bySeq = new Map<Kind, number>();
    for (const s of seqs) bySeq.set(s.kind, (bySeq.get(s.kind) ?? 0) + 1);
    let dup = 0;
    for (const n of bySeq.values()) dup += Math.floor(n / 2);
    if (dup >= 2) add('ryanpeikou', 3, 0);
    else if (dup === 1) add('iipeikou', 1, 0);
  }

  for (const t of triplets) {
    if (t.kind === WHITE) add('yakuhaiWhite', 1, 1);
    if (t.kind === GREEN) add('yakuhaiGreen', 1, 1);
    if (t.kind === RED) add('yakuhaiRed', 1, 1);
    if (t.kind === ctx.seatWind) add('seatWind', 1, 1);
    if (t.kind === ctx.roundWind) add('roundWind', 1, 1);
  }

  const seqAt = (k: Kind) => seqs.some((s) => s.kind === k);
  const tripAt = (k: Kind) => triplets.some((s) => s.kind === k);
  for (let r = 0; r < 7; r++) {
    if (seqAt(r) && seqAt(9 + r) && seqAt(18 + r)) {
      add('sanshokuDoujun', 2, 1);
      break;
    }
  }
  for (let s = 0; s < 3; s++) {
    if (seqAt(9 * s) && seqAt(9 * s + 3) && seqAt(9 * s + 6)) {
      add('ittsu', 2, 1);
      break;
    }
  }
  for (let r = 0; r < 9; r++) {
    if (tripAt(r) && tripAt(9 + r) && tripAt(18 + r)) {
      add('sanshokuDoukou', 2, 2);
      break;
    }
  }

  const hasOutside = (s: ScoredSet) =>
    s.type === 'seq' ? s.kind % 9 === 0 || s.kind % 9 === 6 : isTerminalOrHonor(s.kind);
  if (seqs.length > 0 && sets.every(hasOutside) && isTerminalOrHonor(pair)) {
    if (kinds.some(isHonor)) add('chanta', 2, 1);
    else add('junchan', 3, 2);
  }

  const concealedTriplets = triplets.filter((t) => !t.open).length;
  if (concealedTriplets === 4) addYakuman('suuankou');
  else if (concealedTriplets === 3) add('sanankou', 2, 2);
  if (quads.length === 4) addYakuman('suukantsu');
  else if (quads.length === 3) add('sankantsu', 2, 2);
  if (triplets.length === 4) add('toitoi', 2, 2);

  const dragonTriplets = triplets.filter((t) => isDragon(t.kind)).length;
  if (dragonTriplets === 3) addYakuman('daisangen');
  else if (dragonTriplets === 2 && isDragon(pair)) add('shousangen', 2, 2);
  const windTriplets = triplets.filter((t) => isWind(t.kind)).length;
  if (windTriplets === 4) addYakuman('daisuushii');
  else if (windTriplets === 3 && isWind(pair)) addYakuman('shousuushii');

  if (ctx.melds.length === 0 && isChuuren(counts)) addYakuman('chuuren');

  const fuParts: FuPart[] = [{ reason: 'base', fu: 20 }];
  const addFu = (reason: FuReason, fu: number, extra: Partial<FuPart> = {}) => fuParts.push({ reason, fu, ...extra });
  if (closed && !ctx.tsumo) addFu('closedRon', 10);
  // Pinfu is worth exactly 20 (tsumo) or 30 (ron): no tsumo fu.
  if (!pinfu) {
    if (ctx.tsumo) addFu('tsumo', 2);
    for (const t of triplets) {
      let f = t.type === 'quad' ? 8 : 2;
      if (isTerminalOrHonor(t.kind)) f *= 2;
      if (!t.open) f *= 2;
      addFu(t.type === 'quad' ? 'quad' : 'triplet', f, { kind: t.kind, open: t.open });
    }
    const seat = pair === ctx.seatWind;
    const round = pair === ctx.roundWind;
    if (isDragon(pair)) addFu('valuePair', 2, { kind: pair });
    else if (seat && round) addFu('valuePair', rules.doubleWindPairFu, { kind: pair });
    else if (seat || round) addFu('valuePair', 2, { kind: pair });
    if (wait === 'kanchan' || wait === 'penchan' || wait === 'tanki') addFu('wait', 2);
  }
  let fu = fuParts.reduce((a, p) => a + p.fu, 0);
  // An open hand worth exactly 20 fu (open pinfu shape) gets 2 fu.
  if (!closed && fu === 20) {
    addFu('openPinfu', 2);
    fu += 2;
  }
  fu = Math.ceil(fu / 10) * 10;
  return { yaku, yakuman, fu, fuParts, wait };
}

function isChuuren(c: Counts): boolean {
  const need = [3, 1, 1, 1, 1, 1, 1, 1, 3];
  for (let s = 0; s < 3; s++) {
    let total = 0;
    for (let i = 0; i < 9; i++) total += c[9 * s + i];
    if (total === 14 && need.every((n, i) => c[9 * s + i] >= n)) return true;
  }
  return false;
}

function evalChiitoi(ctx: WinContext, rules: RuleSet, kinds: Kind[]): Candidate {
  const { yaku, yakuman, add, addYakuman } = collector(true);
  commonYaku(ctx, rules, true, kinds, add, addYakuman);
  add('chiitoitsu', 2, 2);
  return { yaku, yakuman, fu: 25, fuParts: [{ reason: 'chiitoitsu', fu: 25 }], wait: 'tanki' };
}

function evalKokushi(ctx: WinContext, rules: RuleSet, kinds: Kind[]): Candidate {
  const { yaku, yakuman, add, addYakuman } = collector(true);
  commonYaku(ctx, rules, true, kinds, add, addYakuman);
  addYakuman('kokushi');
  return { yaku, yakuman, fu: 0, fuParts: [], wait: 'tanki' };
}

function countDora(indicators: Tile[], tiles: Tile[]): number {
  let n = 0;
  for (const ind of indicators) {
    const d = doraFromIndicator(kindOf(ind));
    for (const t of tiles) if (kindOf(t) === d) n++;
  }
  return n;
}

function finalize(c: Candidate, ctx: WinContext, rules: RuleSet, allTiles: Tile[]): HandValue | null {
  if (c.yakuman.length) {
    const yakuman = rules.multipleYakuman ? c.yakuman : [c.yakuman[0]];
    const mult = yakuman.reduce((a, y) => a + y.multiplier, 0);
    return {
      yaku: [],
      yakuman,
      dora: 0,
      redDora: 0,
      uraDora: 0,
      han: 0,
      fu: c.fu,
      fuParts: c.fuParts,
      wait: c.wait,
      limit: 'yakuman',
      basePoints: 8000 * mult,
    };
  }
  const yakuHan = c.yaku.reduce((a, y) => a + y.han, 0);
  if (yakuHan === 0) return null;
  const dora = countDora(ctx.doraIndicators, allTiles);
  const redDora = allTiles.filter((t) => isRedTile(t, rules.redFives)).length;
  const uraDora = ctx.riichi !== 'none' ? countDora(ctx.uraIndicators, allTiles) : 0;
  const han = yakuHan + dora + redDora + uraDora;
  const [limit, basePoints] = limitFor(han, c.fu, rules);
  return {
    yaku: c.yaku,
    yakuman: [],
    dora,
    redDora,
    uraDora,
    han,
    fu: c.fu,
    fuParts: c.fuParts,
    wait: c.wait,
    limit,
    basePoints,
  };
}

export function limitFor(han: number, fu: number, rules: RuleSet): [Limit, number] {
  if (han >= 13 && rules.kazoeYakuman) return ['yakuman', 8000];
  if (han >= 11) return ['sanbaiman', 6000];
  if (han >= 8) return ['baiman', 4000];
  if (han >= 6) return ['haneman', 3000];
  if (han >= 5) return ['mangan', 2000];
  const base = fu * 2 ** (han + 2);
  if (base >= 2000) return ['mangan', 2000];
  if (rules.kiriageMangan && ((han === 4 && fu === 30) || (han === 3 && fu === 60))) return ['mangan', 2000];
  return ['none', base];
}

/** Payment for a win by discard, before counters. */
export function ronPoints(basePoints: number, dealer: boolean): number {
  return roundUp100(basePoints * (dealer ? 6 : 4));
}

/** Per-player payments for a self-draw, before counters. `fromDealer` is unused when the winner is the dealer. */
export function tsumoPoints(basePoints: number, dealer: boolean): { fromDealer: number; fromOthers: number } {
  return dealer
    ? { fromDealer: 0, fromOthers: roundUp100(basePoints * 2) }
    : { fromDealer: roundUp100(basePoints * 2), fromOthers: roundUp100(basePoints) };
}
