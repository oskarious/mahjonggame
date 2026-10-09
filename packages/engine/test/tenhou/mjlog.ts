// Parser for Tenhou game logs in mjlog XML (https://tenhou.net/0/log/?<id>). Tenhou tile ids are ours: 0-135,
// kind = id >> 2, and the red fives are copy 0 (16, 52, 88). Seats are absolute, seat 0 is the first dealer.
import type { Kind, MeldType, Seat, Tile } from '../../src/index.ts';

export interface TenhouMeld {
  type: MeldType;
  /** All tiles of the meld; for an added quad the pon's tiles plus `added`. */
  tiles: Tile[];
  /** The claimed tile (null for a concealed quad, the added tile for an added quad). */
  called: Tile | null;
  /** Discarder of the claimed tile. */
  from: Seat | null;
  kind: Kind;
}

export interface TenhouAgari {
  who: Seat;
  fromWho: Seat;
  /** Concealed tiles including the winning tile. */
  hand: Tile[];
  winTile: Tile;
  fu: number;
  /** Value of the hand without counters and deposits. */
  points: number;
  /** 0 none, 1 mangan, 2 haneman, 3 baiman, 4 sanbaiman, 5 yakuman. */
  limit: number;
  /** Tenhou yaku id → han (yakuman listed with han 13 per yakuman). */
  yaku: [number, number][];
  yakuman: number[];
  doraIndicators: Tile[];
  uraIndicators: Tile[];
  /** Score changes of this win (in points). */
  deltas: number[];
  paoWho: Seat | null;
}

export interface TenhouRyuukyoku {
  /** Missing for an exhaustive draw: yao9 (nine terminals), reach4, ron3, kan4, kaze4, nm (nagashi mangan). */
  reason: string | null;
  deltas: number[];
  /** Seats that showed a tenpai hand. */
  tenpai: Seat[];
}

export type TenhouEvent =
  | { type: 'draw'; seat: Seat; tile: Tile }
  | { type: 'discard'; seat: Seat; tile: Tile }
  | { type: 'reach'; seat: Seat; step: 1 | 2 }
  | { type: 'call'; seat: Seat; meld: TenhouMeld }
  | { type: 'dora'; tile: Tile };

export interface TenhouHand {
  /** 0-3 east, 4-7 south, 8-11 west. */
  round: number;
  honba: number;
  riichiSticks: number;
  dealer: Seat;
  doraIndicator: Tile;
  scores: number[];
  hands: Tile[][];
  events: TenhouEvent[];
  /** One entry per winner (several for a multiple ron), in log order. */
  agari: TenhouAgari[];
  ryuukyoku: TenhouRyuukyoku | null;
  /** Final points and scores, on the hand that ends the game. */
  owari: { points: number[]; scores: number[] } | null;
}

export interface TenhouGame {
  /** GO type flags. */
  lobbyType: number;
  hanchan: boolean;
  redFives: boolean;
  openTanyao: boolean;
  fourPlayers: boolean;
  hands: TenhouHand[];
}

const nums = (s: string | undefined): number[] => (s ? s.split(',').map(Number) : []);

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/(\w+)="([^"]*)"/g)) out[m[1]] = m[2];
  return out;
}

/** Decodes the `m` attribute of an N (call) tag; `who` is the caller. */
export function decodeMeld(who: Seat, m: number): TenhouMeld {
  const rel = m & 3;
  const from = rel ? (who + rel) % 4 : null;
  if (m & 0x4) {
    // Chii: base sequence index, which of the three was called, and the copy of each tile.
    let t = m >> 10;
    const r = t % 3;
    t = Math.floor(t / 3);
    const base = Math.floor(t / 7) * 9 + (t % 7);
    const tiles = [0, 1, 2].map((i) => (base + i) * 4 + ((m >> (3 + 2 * i)) & 3));
    return { type: 'chii', tiles, called: tiles[r], from, kind: base };
  }
  if (m & 0x18) {
    // Pon (0x8) or added quad (0x10): kind, called index and the unused copy.
    const unused = (m >> 5) & 3;
    let t = m >> 9;
    const r = t % 3;
    t = Math.floor(t / 3);
    const kind = t;
    const pon = [0, 1, 2, 3].filter((c) => c !== unused).map((c) => kind * 4 + c);
    if (m & 0x8) return { type: 'pon', tiles: pon, called: pon[r], from, kind };
    const added = kind * 4 + unused;
    return { type: 'shouminkan', tiles: [...pon, added], called: added, from, kind };
  }
  if (m & 0x20) throw new Error('Nukidora (three-player) is not supported');
  const hai = m >> 8;
  const kind = hai >> 2;
  const tiles = [0, 1, 2, 3].map((c) => kind * 4 + c);
  return from === null
    ? { type: 'ankan', tiles, called: null, from: null, kind }
    : { type: 'daiminkan', tiles, called: hai, from, kind };
}

/** Score changes from an `sc` attribute ("before,delta" pairs in hundreds). */
const deltasOf = (sc: string): number[] => {
  const v = nums(sc);
  return [0, 1, 2, 3].map((s) => v[2 * s + 1] * 100);
};

function parseOwari(a: Record<string, string>): TenhouHand['owari'] {
  if (!a.owari) return null;
  const v = nums(a.owari);
  return { points: [0, 1, 2, 3].map((s) => v[2 * s] * 100), scores: [0, 1, 2, 3].map((s) => v[2 * s + 1]) };
}

export function parseMjlog(xml: string): TenhouGame {
  const tags = xml.match(/<[^>]+>/g) ?? [];
  const game: TenhouGame = {
    lobbyType: 0,
    hanchan: false,
    redFives: true,
    openTanyao: true,
    fourPlayers: true,
    hands: [],
  };
  let hand: TenhouHand | null = null;
  const DRAW = 'TUVW';
  const DISCARD = 'DEFG';
  for (const tag of tags) {
    const name = /^<\/?(\w+)/.exec(tag)?.[1] ?? '';
    const a = attrs(tag);
    if (name === 'GO') {
      const t = Number(a.type);
      game.lobbyType = t;
      game.redFives = !(t & 0x2);
      game.openTanyao = !(t & 0x4);
      game.hanchan = !!(t & 0x8);
      game.fourPlayers = !(t & 0x10);
    } else if (name === 'INIT') {
      const seed = nums(a.seed);
      hand = {
        round: seed[0],
        honba: seed[1],
        riichiSticks: seed[2],
        dealer: Number(a.oya),
        doraIndicator: seed[5],
        scores: nums(a.ten).map((x) => x * 100),
        hands: [0, 1, 2, 3].map((s) => nums(a[`hai${s}`])),
        events: [],
        agari: [],
        ryuukyoku: null,
        owari: null,
      };
      game.hands.push(hand);
    } else if (!hand) {
      continue;
    } else if (/^[TUVW]\d+$/.test(name)) {
      hand.events.push({ type: 'draw', seat: DRAW.indexOf(name[0]), tile: Number(name.slice(1)) });
    } else if (/^[DEFG]\d+$/.test(name)) {
      hand.events.push({ type: 'discard', seat: DISCARD.indexOf(name[0]), tile: Number(name.slice(1)) });
    } else if (name === 'N') {
      const who = Number(a.who);
      hand.events.push({ type: 'call', seat: who, meld: decodeMeld(who, Number(a.m)) });
    } else if (name === 'REACH') {
      hand.events.push({ type: 'reach', seat: Number(a.who), step: Number(a.step) as 1 | 2 });
    } else if (name === 'DORA') {
      hand.events.push({ type: 'dora', tile: Number(a.hai) });
    } else if (name === 'AGARI') {
      const ten = nums(a.ten);
      const yaku = nums(a.yaku);
      hand.agari.push({
        who: Number(a.who),
        fromWho: Number(a.fromWho),
        hand: nums(a.hai),
        winTile: Number(a.machi),
        fu: ten[0],
        points: ten[1],
        limit: ten[2],
        yaku: Array.from({ length: yaku.length / 2 }, (_, i) => [yaku[2 * i], yaku[2 * i + 1]]),
        yakuman: nums(a.yakuman),
        doraIndicators: nums(a.doraHai),
        uraIndicators: nums(a.doraHaiUra),
        deltas: deltasOf(a.sc),
        paoWho: a.paoWho === undefined ? null : Number(a.paoWho),
      });
      hand.owari = parseOwari(a);
    } else if (name === 'RYUUKYOKU') {
      hand.ryuukyoku = {
        reason: a.type ?? null,
        deltas: deltasOf(a.sc),
        tenpai: [0, 1, 2, 3].filter((s) => a[`hai${s}`] !== undefined),
      };
      hand.owari = parseOwari(a);
    }
  }
  return game;
}
