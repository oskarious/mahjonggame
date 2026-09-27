import type { Kind } from '@mahjong/engine';

/** Context key for board-wide tile markings, read by every Tile. */
export const TILE_MARKS = Symbol('tile-marks');

export interface TileMarks {
  /** Kinds that are currently dora (from the revealed indicators). */
  dora: Set<Kind>;
  /** Kind the player is looking at (selected or under the finger); all copies get highlighted. */
  focus: Kind | null;
}
