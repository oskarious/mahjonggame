import { type Kind, type Tile, NUM_KINDS, kindOf, isTerminalOrHonor } from './tiles.ts';
import type { Meld } from './types.ts';

/** Count of each tile kind, length 34. */
export type Counts = number[];

export function countKinds(tiles: readonly Tile[]): Counts {
  const c = new Array<number>(NUM_KINDS).fill(0);
  for (const t of tiles) c[kindOf(t)]++;
  return c;
}

const sum = (c: Counts) => c.reduce((a, b) => a + b, 0);

export interface ConcealedGroup {
  type: 'seq' | 'trip';
  /** Lowest kind of the group. */
  kind: Kind;
}

/** A concealed part split into a pair plus sets. */
export interface StandardShape {
  pair: Kind;
  groups: ConcealedGroup[];
}

/** All ways to split concealed tiles (3n+2 of them) into sets and one pair. */
export function decomposeStandard(counts: Counts): StandardShape[] {
  if (sum(counts) % 3 !== 2) return [];
  const out: StandardShape[] = [];
  const c = counts.slice();
  const groups: ConcealedGroup[] = [];
  for (let k = 0; k < NUM_KINDS; k++) {
    if (c[k] < 2) continue;
    c[k] -= 2;
    extractSets(c, 0, groups, () => out.push({ pair: k, groups: groups.slice() }));
    c[k] += 2;
  }
  return out;
}

function extractSets(c: Counts, i: number, groups: ConcealedGroup[], emit: () => void): void {
  while (i < NUM_KINDS && c[i] === 0) i++;
  if (i === NUM_KINDS) {
    emit();
    return;
  }
  if (c[i] >= 3) {
    c[i] -= 3;
    groups.push({ type: 'trip', kind: i });
    extractSets(c, i, groups, emit);
    groups.pop();
    c[i] += 3;
  }
  if (i < 27 && i % 9 <= 6 && c[i + 1] > 0 && c[i + 2] > 0) {
    c[i]--, c[i + 1]--, c[i + 2]--;
    groups.push({ type: 'seq', kind: i });
    extractSets(c, i, groups, emit);
    groups.pop();
    c[i]++, c[i + 1]++, c[i + 2]++;
  }
}

function hasStandard(counts: Counts): boolean {
  if (sum(counts) % 3 !== 2) return false;
  const c = counts.slice();
  for (let k = 0; k < NUM_KINDS; k++) {
    if (c[k] < 2) continue;
    c[k] -= 2;
    const ok = canExtract(c, 0);
    c[k] += 2;
    if (ok) return true;
  }
  return false;
}

function canExtract(c: Counts, i: number): boolean {
  while (i < NUM_KINDS && c[i] === 0) i++;
  if (i === NUM_KINDS) return true;
  if (c[i] >= 3) {
    c[i] -= 3;
    const ok = canExtract(c, i);
    c[i] += 3;
    if (ok) return true;
  }
  if (i < 27 && i % 9 <= 6 && c[i + 1] > 0 && c[i + 2] > 0) {
    c[i]--, c[i + 1]--, c[i + 2]--;
    const ok = canExtract(c, i);
    c[i]++, c[i + 1]++, c[i + 2]++;
    if (ok) return true;
  }
  return false;
}

/** Seven distinct pairs (two identical pairs are not allowed). */
export function isChiitoi(c: Counts): boolean {
  return sum(c) === 14 && c.filter((n) => n === 2).length === 7;
}

const TERMINALS_AND_HONORS: Kind[] = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];

export function isKokushi(c: Counts): boolean {
  if (sum(c) !== 14) return false;
  for (let k = 0; k < NUM_KINDS; k++) {
    if (isTerminalOrHonor(k) ? c[k] < 1 : c[k] !== 0) return false;
  }
  return true;
}

export function isComplete(counts: Counts, meldCount: number): boolean {
  return hasStandard(counts) || (meldCount === 0 && (isChiitoi(counts) || isKokushi(counts)));
}

/**
 * Tile kinds that complete a concealed part of 13 - 3 * melds tiles.
 * A hand holding all four copies of a kind cannot wait on it; with `meldedCopies: false` only concealed copies count
 * (Tenhou's tenpai at an exhaustive draw, see `RuleSet.deadWaitCopies`).
 */
export function waits(concealed: readonly Tile[], melds: readonly Meld[], meldedCopies = true): Kind[] {
  const c = countKinds(concealed);
  const held = c.slice();
  if (meldedCopies) for (const m of melds) for (const t of m.tiles) held[kindOf(t)]++;
  const out: Kind[] = [];
  for (let k = 0; k < NUM_KINDS; k++) {
    if (held[k] >= 4) continue;
    c[k]++;
    if (isComplete(c, melds.length)) out.push(k);
    c[k]--;
  }
  return out;
}

export function distinctTerminalsAndHonors(tiles: readonly Tile[]): number {
  const c = countKinds(tiles);
  return TERMINALS_AND_HONORS.filter((k) => c[k] > 0).length;
}

// ---------------------------------------------------------------------------
// Shanten (tiles away from tenpai; -1 = complete). Used by bots and UI hints.

const blockCache = new Map<number, number[][]>();

/** Achievable [sets, partial sets, pair] combinations within one suit (or the honours). */
function blockOptions(c: Counts, offset: number, len: number, suited: boolean): number[][] {
  return groupOptions(c.slice(offset, offset + len), suited);
}

/**
 * Memoized over the remaining counts: the lowest non-empty kind is always taken next, so the
 * counts alone identify the sub-problem. Mutates `a` temporarily.
 */
function groupOptions(a: number[], suited: boolean): number[][] {
  let key = suited ? 1 : 2;
  for (const n of a) key = key * 5 + n;
  const hit = blockCache.get(key);
  if (hit) return hit;

  const len = a.length;
  let i = 0;
  while (i < len && a[i] === 0) i++;
  if (i === len) {
    const empty = [[0, 0, 0]];
    blockCache.set(key, empty);
    return empty;
  }

  const found: number[][] = [];
  const take = (idx: number[], dm: number, dt: number, dp: number) => {
    for (const j of idx) a[j]--;
    for (const [m, t, p] of groupOptions(a, suited)) if (p + dp <= 1) found.push([m + dm, t + dt, p + dp]);
    for (const j of idx) a[j]++;
  };
  if (a[i] >= 3) take([i, i, i], 1, 0, 0);
  if (suited && i + 2 < len && a[i + 1] && a[i + 2]) take([i, i + 1, i + 2], 1, 0, 0);
  if (a[i] >= 2) {
    take([i, i], 0, 0, 1);
    take([i, i], 0, 1, 0);
  }
  if (suited && i + 1 < len && a[i + 1]) take([i, i + 1], 0, 1, 0);
  if (suited && i + 2 < len && a[i + 2]) take([i, i + 2], 0, 1, 0);
  take([i], 0, 0, 0);

  // Shanten is monotone in sets and partial sets, so dominated options can be dropped.
  const res = found.filter(
    (r, x) =>
      !found.some(
        (q, y) => y !== x && q[2] === r[2] && q[0] >= r[0] && q[1] >= r[1] && (q[0] > r[0] || q[1] > r[1] || y < x),
      ),
  );
  blockCache.set(key, res);
  return res;
}

export function standardShanten(c: Counts, meldCount: number): number {
  const parts = [
    blockOptions(c, 0, 9, true),
    blockOptions(c, 9, 9, true),
    blockOptions(c, 18, 9, true),
    blockOptions(c, 27, 7, false),
  ];
  let best = 8;
  for (const a of parts[0])
    for (const b of parts[1])
      for (const d of parts[2])
        for (const e of parts[3]) {
          const p = a[2] + b[2] + d[2] + e[2];
          if (p > 1) continue;
          const m = a[0] + b[0] + d[0] + e[0] + meldCount;
          const t = a[1] + b[1] + d[1] + e[1];
          const s = 8 - 2 * m - Math.min(t, 4 - m) - p;
          if (s < best) best = s;
        }
  return best;
}

export function chiitoiShanten(c: Counts): number {
  const pairs = c.filter((n) => n >= 2).length;
  const kinds = c.filter((n) => n >= 1).length;
  return 6 - pairs + Math.max(0, 7 - kinds);
}

export function kokushiShanten(c: Counts): number {
  const kinds = TERMINALS_AND_HONORS.filter((k) => c[k] > 0).length;
  const pair = TERMINALS_AND_HONORS.some((k) => c[k] >= 2) ? 1 : 0;
  return 13 - kinds - pair;
}

export function shanten(c: Counts, meldCount: number): number {
  const s = standardShanten(c, meldCount);
  if (meldCount > 0) return s;
  return Math.min(s, chiitoiShanten(c), kokushiShanten(c));
}
