// A moment of a bot game rebuilt as a lesson `Position` with the reader as seat 0: plain data that every Learn goal
// and feedback function takes, and that holds no other seat's tiles.
import {
  type GameState,
  type Meld,
  type MeldType,
  type Seat,
  type Tile,
  type WinRecord,
  tileToString,
} from '@mahjong/engine';
import { RED } from './position.ts';
import type { Position } from './types.ts';

/** Notation for physical tiles; red fives stay red. */
export const notation = (tiles: readonly Tile[]) => tiles.map((t) => tileToString(t, RED)).join('');

/** Seat numbers as seen from `reader` (who becomes seat 0). */
const rotate = (reader: Seat) => (s: Seat) => ((s - reader + 4) % 4) as Seat;

const revealed = (g: GameState) => g.hand.doraIndicators.slice(0, g.hand.doraRevealed);

/** Meld tiles in `scenario` order: the called tile first, an added kan tile last. */
function meldEntry(m: Meld): [MeldType, string] {
  const rest = m.tiles.filter((t) => t !== m.called && t !== m.added);
  const tiles = [...(m.called !== null ? [m.called] : []), ...rest, ...(m.added !== undefined ? [m.added] : [])];
  return [m.type, notation(tiles)];
}

/** The reader's own turn, 14 tiles with the drawn one apart: only the hand and the dora indicator. */
export function turnPosition(g: GameState, reader: Seat): Position {
  const me = g.hand.players[reader];
  return {
    hands: [notation(me.hand.filter((t) => t !== me.drawn))],
    draws: notation([me.drawn!]),
    turn: 0,
    dealer: rotate(reader)(g.dealer),
    roundWind: g.roundWind,
    dora: notation(revealed(g).slice(0, 1)),
  };
}

/** The reader's 13 closed tiles between turns (the seat to the right is on turn). */
export function handPosition(g: GameState, reader: Seat): Position {
  return {
    hands: [notation(g.hand.players[reader].hand)],
    dealer: rotate(reader)(g.dealer),
    roundWind: g.roundWind,
    turn: 1,
    dora: notation(revealed(g).slice(0, 1)),
  };
}

/** A win, from the winner's seat, at the moment the winning tile is drawn or discarded. */
export function winPosition(g: GameState, w: WinRecord): Position {
  const rot = rotate(w.seat);
  const p = g.hand.players[w.seat];
  const i = w.hand.indexOf(w.winTile);
  const concealed = [...w.hand.slice(0, i), ...w.hand.slice(i + 1)];
  const riichi = p.riichi !== null;
  const ura = g.hand.uraIndicators.slice(0, g.hand.doraRevealed);
  return {
    hands: [notation(concealed)],
    melds: [0, 1, 2, 3].map((s) =>
      // Other seats' quads are public and reveal kan dora: they come along, the rest of their melds don't matter.
      s === 0
        ? w.melds.map(meldEntry)
        : g.hand.players[(s + w.seat) % 4].melds.filter((m) => m.tiles.length === 4).map(meldEntry),
    ),
    dealer: rot(g.dealer),
    roundWind: g.roundWind,
    riichi: riichi ? [0] : undefined,
    dora: notation(revealed(g)),
    // Without riichi the ura indicators stay hidden; they are passed so that no default tile collides with the hand.
    ura: notation(ura),
    turn: w.from === null ? 0 : rot(w.from),
    draws: notation([w.winTile]),
    discard: w.from === null ? undefined : true,
  };
}
