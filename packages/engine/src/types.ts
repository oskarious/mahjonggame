import type { Tile } from './tiles.ts';

/** Fixed seat index 0-3. Seat 0 is the initial dealer; turn order is 0 → 1 → 2 → 3. */
export type Seat = number;

export type MeldType = 'chii' | 'pon' | 'daiminkan' | 'shouminkan' | 'ankan';

export interface Meld {
  type: MeldType;
  /** Every tile in the meld, including the claimed/added tile. */
  tiles: Tile[];
  /** The claimed discard (null for a concealed quad). */
  called: Tile | null;
  /** Seat that discarded the claimed tile (null for a concealed quad). */
  from: Seat | null;
  /** For an extended quad: the tile added to the triplet. */
  added?: Tile;
}

export const isOpenMeld = (m: Meld) => m.type !== 'ankan';
