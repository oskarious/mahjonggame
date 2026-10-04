// How safe a tile is against a riichi player, from what the reader can see: a teaching heuristic (after Riichi Book
// I's safety ranking), not a rule. Lessons only; the engine, bots and hints don't use it. Pure.
import { type GameState, type Kind, type Seat, isHonor, kindOf, unseenCounts } from '@mahjong/engine';

/** 1 = safest. */
export type Grade = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** Why a tile has its grade, for feedback ("{5p}: …"). */
export type Reason =
  | 'genbutsu'
  | 'honor-gone'
  | 'honor-1'
  | 'honor-2'
  | 'honor-3'
  | 'suji'
  | 'no-chance'
  | 'one-chance'
  | 'half-suji'
  | 'open';

export interface Safety {
  grade: Grade;
  reason: Reason;
}

/**
 * The kinds the riichi seat cannot ron: its own discards, and tiles others discarded after its riichi (`passed`):
 * letting a winning tile pass in riichi makes it furiten for the rest of the hand.
 */
export function genbutsu(g: GameState, seat: Seat, passed: readonly Kind[] = []): Set<Kind> {
  return new Set([...g.hand.players[seat].discards.map((d) => kindOf(d.tile)), ...passed]);
}

/** Copies seat 0 cannot see, by the number left (an honor nobody else can hold is safe from every wait). */
const HONOR: Record<number, Safety> = {
  0: { grade: 2, reason: 'honor-gone' },
  1: { grade: 3, reason: 'honor-1' },
  2: { grade: 4, reason: 'honor-2' },
  3: { grade: 5, reason: 'honor-3' },
};

/** Suji-safe grade by rank (1-based): terminals safest, 3/7 weakest, 4/5/6 only with both sides. */
const SUJI_GRADE: Record<number, Grade> = {
  1: 2,
  2: 3,
  3: 4,
  4: 3,
  5: 3,
  6: 3,
  7: 4,
  8: 3,
  9: 2,
};
/** No suji side covered, by rank. */
const OPEN_GRADE: Record<number, Grade> = {
  1: 5,
  2: 6,
  3: 7,
  4: 8,
  5: 8,
  6: 8,
  7: 7,
  8: 6,
  9: 5,
};

type Side = 'suji' | 'wall' | 'one' | 'open';

/**
 * The safety of every kind against `seat` (in riichi), as seen by seat 0. Number tiles are judged against two-sided
 * waits: a tile n is hit by the shapes (n+1, n+2) and (n-2, n-1) where they are two-sided. A side is suji when its
 * other wait (n+3 or n-3) is genbutsu, a wall when a tile of its shape is all visible, one-chance when one copy is left.
 */
export function safetyGrades(g: GameState, seat: Seat, passed: readonly Kind[] = []): Map<Kind, Safety> {
  const safe = genbutsu(g, seat, passed);
  const unseen = unseenCounts(g, 0);
  const out = new Map<Kind, Safety>();
  for (let k = 0; k < unseen.length; k++) {
    if (safe.has(k)) {
      out.set(k, { grade: 1, reason: 'genbutsu' });
      continue;
    }
    if (isHonor(k)) {
      out.set(k, HONOR[unseen[k]] ?? HONOR[3]);
      continue;
    }
    const n = (k % 9) + 1;
    const base = k - (n - 1);
    const side = (other: number, a: number, b: number): Side => {
      if (safe.has(base + other - 1)) return 'suji';
      const left = Math.min(unseen[base + a - 1], unseen[base + b - 1]);
      return left === 0 ? 'wall' : left === 1 ? 'one' : 'open';
    };
    const sides: Side[] = [];
    if (n >= 4) sides.push(side(n - 3, n - 2, n - 1));
    if (n <= 6) sides.push(side(n + 3, n + 1, n + 2));
    if (sides.every((s) => s === 'suji')) out.set(k, { grade: SUJI_GRADE[n], reason: 'suji' });
    else if (sides.every((s) => s === 'suji' || s === 'wall')) out.set(k, { grade: 2, reason: 'no-chance' });
    else if (sides.every((s) => s !== 'open')) out.set(k, { grade: 4, reason: 'one-chance' });
    else if (sides.includes('suji')) out.set(k, { grade: 7, reason: 'half-suji' });
    else out.set(k, { grade: OPEN_GRADE[n], reason: 'open' });
  }
  return out;
}

/** The kinds that cannot complete any two-sided wait because a tile of each shape is all visible (kabe). */
export function noChance(g: GameState): Kind[] {
  const unseen = unseenCounts(g, 0);
  const out: Kind[] = [];
  for (let k = 0; k < 27; k++) {
    const n = (k % 9) + 1;
    const base = k - (n - 1);
    const walled = (a: number, b: number) => unseen[base + a - 1] === 0 || unseen[base + b - 1] === 0;
    const sides: boolean[] = [];
    if (n >= 4) sides.push(walled(n - 2, n - 1));
    if (n <= 6) sides.push(walled(n + 1, n + 2));
    if (sides.every(Boolean)) out.push(k);
  }
  return out;
}

/** Feedback text per reason (the tile token goes in front). */
export const REASON_TEXT: Record<Reason, string> = {
  genbutsu: 'genbutsu, they cannot ron it',
  'honor-gone': 'every other copy is visible',
  'honor-1': 'an honor with one copy unseen',
  'honor-2': 'an honor with two copies unseen',
  'honor-3': 'an honor nobody has discarded yet',
  suji: 'suji',
  'no-chance': 'no-chance: the wall rules out a two-sided wait',
  'one-chance': 'one-chance: only one copy left for a two-sided wait',
  'half-suji': 'only one suji side discarded',
  open: 'no suji, open to two-sided waits',
};
