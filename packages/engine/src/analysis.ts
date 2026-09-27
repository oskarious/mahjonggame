import { type Kind, type Tile, NUM_KINDS, kindOf } from './tiles.ts';
import { type Counts, countKinds, shanten, waits } from './hand.ts';
import type { Meld, Seat } from './types.ts';
import type { GameState } from './game.ts';

export interface TileCount {
  kind: Kind;
  /** Copies not visible to the player (not in their hand, any discard pile, meld or dora indicator). */
  remaining: number;
}

/** Analysis of a hand between turns (13 - 3 * melds concealed tiles). */
export interface HandAnalysis {
  /**
   * Tiles away from tenpai: 0 = tenpai, 1 = one useful tile away, ...
   * A hand that only waits on a tile it holds all four copies of is noten (EMA 3.3.8), so it counts as 1.
   */
  shanten: number;
  tenpai: boolean;
  /** Winning tiles, when tenpai. */
  waits: TileCount[];
  /** Tiles that reduce shanten, when not tenpai. */
  ukeire: TileCount[];
  /** Sum of `remaining` over waits (tenpai) or ukeire (not tenpai). */
  total: number;
}

/** What the hand looks like after discarding a tile of `kind`. */
export interface DiscardOption extends HandAnalysis {
  kind: Kind;
  /** Tenpai after this discard, but furiten (a winning tile is among own discards, including this one). */
  furiten: boolean;
}

export interface SeatAnalysis {
  /** Between turns: the current hand. On own turn: the best result over all discards. */
  shanten: number;
  tenpai: boolean;
  waits: TileCount[];
  ukeire: TileCount[];
  total: number;
  /** The hand is complete (can declare tsumo if it has a yaku). Only on own turn. */
  complete: boolean;
  /** Between turns: currently furiten for ron. */
  furiten: boolean;
  /** On own turn: every distinct discard, best first. Null between turns. */
  discards: DiscardOption[] | null;
}

/** Copies of each kind `seat` cannot see. */
export function unseenCounts(g: GameState, seat: Seat): Counts {
  const h = g.hand;
  const seen = [...h.players[seat].hand, ...h.doraIndicators.slice(0, h.doraRevealed)];
  for (const p of h.players) {
    for (const d of p.discards) if (d.calledBy === null) seen.push(d.tile);
    for (const m of p.melds) seen.push(...m.tiles);
  }
  const c = countKinds(seen);
  return c.map((n) => Math.max(0, 4 - n));
}

const toCounts = (kinds: Kind[], unseen: Counts): TileCount[] => kinds.map((kind) => ({ kind, remaining: unseen[kind] }));
const sumRemaining = (list: TileCount[]) => list.reduce((a, t) => a + t.remaining, 0);

/** Analyzes a hand of 13 - 3 * melds concealed tiles. */
export function analyzeHand(concealed: readonly Tile[], melds: readonly Meld[], unseen: Counts): HandAnalysis {
  const w = waits(concealed, melds);
  if (w.length) {
    const list = toCounts(w, unseen);
    return { shanten: 0, tenpai: true, waits: list, ukeire: [], total: sumRemaining(list) };
  }
  const c = countKinds(concealed);
  const raw = shanten(c, melds.length);
  const s = Math.max(raw, 1);
  const improving: Kind[] = [];
  for (let k = 0; k < NUM_KINDS; k++) {
    if (unseen[k] === 0) continue;
    c[k]++;
    const better = s === 1 && raw === 0 ? reachesTenpai(concealed, k, melds) : shanten(c, melds.length) < s;
    c[k]--;
    if (better) improving.push(k);
  }
  const list = toCounts(improving, unseen);
  return { shanten: s, tenpai: false, waits: [], ukeire: list, total: sumRemaining(list) };
}

/** Rare case: shanten 0 by shape but noten (fifth-tile rule). Checks for real tenpai after drawing `k`. */
function reachesTenpai(concealed: readonly Tile[], k: Kind, melds: readonly Meld[]): boolean {
  const withK = [...concealed, k * 4 + 3];
  const tried = new Set<Kind>();
  for (const t of withK) {
    const d = kindOf(t);
    if (tried.has(d)) continue;
    tried.add(d);
    const i = withK.indexOf(t);
    if (waits([...withK.slice(0, i), ...withK.slice(i + 1)], melds).length) return true;
  }
  return false;
}

/** Every distinct discard from a hand of 14 - 3 * melds concealed tiles, best first. */
export function analyzeDiscards(
  concealed: readonly Tile[],
  melds: readonly Meld[],
  unseen: Counts,
  ownDiscards: readonly Kind[] = [],
): DiscardOption[] {
  const out: DiscardOption[] = [];
  const seen = new Set<Kind>();
  concealed.forEach((t, i) => {
    const kind = kindOf(t);
    if (seen.has(kind)) return;
    seen.add(kind);
    const rest = [...concealed.slice(0, i), ...concealed.slice(i + 1)];
    const a = analyzeHand(rest, melds, unseen);
    const furiten = a.tenpai && a.waits.some((w) => w.kind === kind || ownDiscards.includes(w.kind));
    out.push({ ...a, kind, furiten });
  });
  return out.sort((a, b) => a.shanten - b.shanten || b.total - a.total || a.kind - b.kind);
}

/** Full analysis for one seat in the current state (between turns or on their own turn). */
export function analyzeSeat(g: GameState, seat: Seat): SeatAnalysis {
  const p = g.hand.players[seat];
  const unseen = unseenCounts(g, seat);
  const ownDiscards = p.discards.map((d) => kindOf(d.tile));
  const size = p.hand.length + 3 * p.melds.length;

  if (size === 13) {
    const a = analyzeHand(p.hand, p.melds, unseen);
    const furiten =
      p.tempFuriten || p.riichiFuriten || (a.tenpai && a.waits.some((w) => ownDiscards.includes(w.kind)));
    return { ...a, complete: false, furiten, discards: null };
  }

  const discards = analyzeDiscards(p.hand, p.melds, unseen, ownDiscards);
  const best = discards[0];
  return {
    shanten: best.shanten,
    tenpai: best.tenpai,
    waits: best.waits,
    ukeire: best.ukeire,
    total: best.total,
    complete: shanten(countKinds(p.hand), p.melds.length) === -1,
    furiten: false,
    discards,
  };
}
