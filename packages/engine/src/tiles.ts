/**
 * Tile kinds 0-33:
 *   0-8   man (characters) 1-9
 *   9-17  pin (circles) 1-9
 *   18-26 sou (bamboo) 1-9
 *   27-30 winds east, south, west, north
 *   31-33 dragons white, green, red
 */
export type Kind = number;

/**
 * Physical tiles 0-135. kind = tile >> 2, copy = tile & 3.
 * Red fives (when enabled) are the lowest copies of each five.
 */
export type Tile = number;

export const NUM_KINDS = 34;
export const EAST = 27;
export const SOUTH = 28;
export const WEST = 29;
export const NORTH = 30;
export const WHITE = 31;
export const GREEN = 32;
export const RED = 33;

/** Number of red fives per suit (0 = none). */
export interface RedFives {
  man: number;
  pin: number;
  sou: number;
}

export const kindOf = (t: Tile): Kind => t >> 2;
export const isSuited = (k: Kind) => k < 27;
/** 0 man, 1 pin, 2 sou, 3 honours. */
export const suitOf = (k: Kind) => (k < 27 ? Math.floor(k / 9) : 3);
/** 1-9 for suited tiles, 0 for honours. */
export const rankOf = (k: Kind) => (k < 27 ? (k % 9) + 1 : 0);
export const isHonor = (k: Kind) => k >= 27;
export const isWind = (k: Kind) => k >= EAST && k <= NORTH;
export const isDragon = (k: Kind) => k >= WHITE;
export const isTerminal = (k: Kind) => k < 27 && (k % 9 === 0 || k % 9 === 8);
export const isTerminalOrHonor = (k: Kind) => k >= 27 || k % 9 === 0 || k % 9 === 8;
export const isSimple = (k: Kind) => !isTerminalOrHonor(k);
/** Wind index 0-3 (east-north) to kind. */
export const windKind = (wind: number): Kind => EAST + wind;

export function doraFromIndicator(k: Kind): Kind {
  if (k < 27) return k - (k % 9) + (((k % 9) + 1) % 9);
  if (k <= NORTH) return EAST + ((k - EAST + 1) % 4);
  return WHITE + ((k - WHITE + 1) % 3);
}

export function isRedTile(t: Tile, red: RedFives): boolean {
  const k = kindOf(t);
  if (k >= 27 || k % 9 !== 4) return false;
  const n = [red.man, red.pin, red.sou][suitOf(k)];
  return (t & 3) < n;
}

const SUITS = 'mpsz';

export function kindToString(k: Kind): string {
  return k < 27 ? `${(k % 9) + 1}${SUITS[Math.floor(k / 9)]}` : `${k - 26}z`;
}

/** "5m", or "0m" for a red five. */
export function tileToString(t: Tile, red?: RedFives): string {
  if (red && isRedTile(t, red)) return `0${SUITS[suitOf(kindOf(t))]}`;
  return kindToString(kindOf(t));
}

/**
 * Parses compact notation like "123m406p11z" into distinct physical tiles.
 * 0 is a red five (copy 0). z: 1-7 = east, south, west, north, white, green, red.
 * Pass the same `used` set to several calls to keep tile ids distinct between them.
 */
export function parseTiles(s: string, used: Set<Tile> = new Set()): Tile[] {
  const out: Tile[] = [];
  let digits: number[] = [];
  for (const ch of s.replace(/\s+/g, '')) {
    if (ch >= '0' && ch <= '9') {
      digits.push(Number(ch));
      continue;
    }
    const suit = SUITS.indexOf(ch);
    if (suit < 0) throw new Error(`Bad tile notation: ${s}`);
    for (const d of digits) {
      const red = d === 0;
      const rank = red ? 5 : d;
      if (suit === 3 ? rank < 1 || rank > 7 || red : rank < 1) throw new Error(`Bad tile: ${d}${ch}`);
      const kind = suit * 9 + rank - 1;
      const copies = red ? [0] : rank === 5 && suit < 3 ? [1, 2, 3, 0] : [0, 1, 2, 3];
      const copy = copies.find((c) => !used.has(kind * 4 + c));
      if (copy === undefined) throw new Error(`Too many copies of ${d}${ch}`);
      used.add(kind * 4 + copy);
      out.push(kind * 4 + copy);
    }
    digits = [];
  }
  if (digits.length) throw new Error(`Missing suit in: ${s}`);
  return out;
}
