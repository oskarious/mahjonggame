// Test-only: deals a hand from an explicit wall, to replay recorded games from other sites (test/tenhou). Not exported
// from the package index: online and offline games always deal from the seeded wall RNG (fair-play.md), and nothing a
// client sends can reach this.
import type { Tile } from './tiles.ts';
import type { Seat } from './types.ts';
import type { GameState } from './game.ts';

/** Everything known about one hand's wall; tiles not given are filled with the unused ones. */
export interface WallLayout {
  /** The 13 starting tiles of each seat. */
  hands: Tile[][];
  /** Draws from the live wall in order, starting with the dealer's first draw. */
  draws: Tile[];
  /** Replacement tiles for quads in order. */
  rinshan: Tile[];
  /** Dora indicators in reveal order. */
  dora: Tile[];
  /** Ura dora indicators, matching `dora`. */
  ura: Tile[];
}

const LIVE_WALL = 136 - 14 - 4 * 13;

/**
 * Replaces the hand just dealt in `g` (at the start of a hand: after `createGame` or a `nextHand`) with one dealt from
 * `layout`, with the dealer having drawn. Returns a new state; throws if the layout uses a tile twice or too many.
 */
export function withWall(state: GameState, layout: WallLayout): GameState {
  const g = structuredClone(state);
  const h = g.hand;
  if (g.phase !== 'playing' || h.players.some((p) => p.discards.length || p.melds.length)) {
    throw new Error('withWall needs a state at the start of a hand');
  }
  const used = new Set<Tile>();
  const take = (tiles: Tile[], max: number, what: string): Tile[] => {
    if (tiles.length > max) throw new Error(`Too many ${what}: ${tiles.length}`);
    for (const t of tiles) {
      if (!Number.isInteger(t) || t < 0 || t >= 136 || used.has(t)) throw new Error(`Bad or repeated tile ${t}`);
      used.add(t);
    }
    return [...tiles];
  };
  const hands = layout.hands.map((t, s) => {
    if (t.length !== 13) throw new Error(`Seat ${s} has ${t.length} tiles`);
    return take(t, 13, 'hand tiles');
  });
  const wall = take(layout.draws, LIVE_WALL, 'draws');
  const rinshan = take(layout.rinshan, 4, 'replacement tiles');
  const dora = take(layout.dora, 5, 'dora indicators');
  const ura = take(layout.ura, 5, 'ura indicators');
  const pool = Array.from({ length: 136 }, (_, i) => i).filter((t) => !used.has(t));
  const fill = (tiles: Tile[], n: number) => tiles.push(...pool.splice(0, n - tiles.length));
  fill(wall, LIVE_WALL);
  fill(rinshan, 4);
  fill(dora, 5);
  fill(ura, 5);

  h.wall = wall;
  h.rinshan = rinshan;
  h.doraIndicators = dora;
  h.uraIndicators = ura;
  h.players.forEach((p, s: Seat) => {
    p.hand = hands[s];
    p.drawn = null;
  });
  const dealer = h.players[g.dealer];
  const first = h.wall.shift()!;
  dealer.hand.push(first);
  dealer.drawn = first;
  h.step = { type: 'turn', seat: g.dealer, afterCall: false, rinshan: false };
  return g;
}
