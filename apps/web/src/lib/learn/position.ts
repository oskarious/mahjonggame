import {
  type GameState,
  type HandValue,
  type Meld,
  type Tile,
  DEFAULT_RULES,
  applyAction,
  kindOf,
  legalActions,
  parseTiles,
  pendingSeats,
  scenario,
} from '@mahjong/engine';
import type { Position } from './types';

/** Lessons teach the rules played on the site. */
export const LESSON_RULES = DEFAULT_RULES;
export const RED = LESSON_RULES.redFives;

/** Distinct physical tiles for a notation string (spaces allowed), for figures. */
export function tilesOf(notation: string): Tile[] {
  return parseTiles(notation.replace(/\s+/g, ''));
}

/**
 * Builds the state: seat 0 is the reader. With `discard`, the seat on turn discards its drawn tile. If nobody can
 * call it, the game moves on to the next draw; that must not be seat 0's (seat 0 would hold 14 tiles), so a discard
 * seat 0 cannot claim has to come from the right or across.
 */
export function buildPosition(p: Position): GameState {
  const { discard, passed, ...opts } = p;
  let g = scenario({ rules: LESSON_RULES, ...opts });
  if (passed) {
    const others = new Set(
      g.hand.players.flatMap((pl, s) => (p.riichi?.includes(s) ? [] : pl.discards.map((d) => kindOf(d.tile)))),
    );
    for (const k of kindsOf(tilesOf(passed)))
      if (!others.has(k)) throw new Error(`passed: ${k} is not in another seat's river`);
  }
  if (discard) {
    const step = g.hand.step;
    if (step.type !== 'turn' || step.seat === 0) throw new Error('`discard` needs another seat on turn');
    const tile = g.hand.players[step.seat].drawn!;
    const before = g.hand.players[0];
    const furiten = { temp: before.tempFuriten, riichi: before.riichiFuriten };
    g = applyAction(g, { type: 'discard', seat: step.seat, tile }).state;
    const after = g.hand.step;
    if (after.type === 'turn' && after.seat === 0) {
      throw new Error('Nobody can call this discard and seat 0 would draw: discard from the right or across');
    }
    // The exercise is the moment of the discard. If seat 0 could not ron, the game already moved on and made seat 0
    // furiten for letting a winning tile pass; that belongs to after the question, so undo it.
    const me = g.hand.players[0];
    me.tempFuriten = furiten.temp;
    me.riichiFuriten = furiten.riichi;
  }
  return g;
}

/** The winning tile seat 0 is looking at: its own draw on its turn, or the latest discard by another seat. */
export interface WinSpot {
  by: 'tsumo' | 'ron';
  tile: Tile;
  /** Seat 0's concealed tiles without the winning tile. */
  concealed: Tile[];
  melds: Meld[];
  from: number | null;
}

export function winSpot(g: GameState): WinSpot {
  const h = g.hand;
  const me = h.players[0];
  if (h.step.type === 'turn' && h.step.seat === 0 && me.drawn !== null) {
    return {
      by: 'tsumo',
      tile: me.drawn,
      concealed: me.hand.filter((t) => t !== me.drawn),
      melds: me.melds,
      from: null,
    };
  }
  // The discard stays the latest one while a call window is open, and also when nobody could call it.
  const d = h.lastDiscard;
  if (d && d.seat !== 0)
    return {
      by: 'ron',
      tile: d.tile,
      concealed: [...me.hand],
      melds: me.melds,
      from: d.seat,
    };
  throw new Error('No winning tile for seat 0 in this position');
}

/** Seat 0 declares the win, if it can: the hand's value and seat 0's score change (counters included). */
export function declareWin(g: GameState): { value: HandValue; gain: number } | null {
  const action = legalActions(g, 0).find((a) => a.type === 'tsumo' || a.type === 'ron');
  if (!action) return null;
  let s = applyAction(g, action).state;
  // Others who could also call this tile still have to answer before the window closes: they pass.
  while (s.phase === 'playing' && s.hand.step.type === 'calls') {
    const seat = pendingSeats(s)[0];
    if (seat === undefined) break;
    s = applyAction(s, { type: 'pass', seat }).state;
  }
  const r = s.result;
  if (r?.type !== 'win') return null;
  const w = r.wins.find((x) => x.seat === 0)!;
  return { value: w.value, gain: r.deltas[0] };
}

export const kindsOf = (tiles: readonly Tile[]) => [...new Set(tiles.map(kindOf))].sort((a, b) => a - b);

/** Width of called melds in tile widths, for sizing a row of tiles: their tiles, sideways ones about twice as wide, gaps. */
export const meldSlots = (melds: readonly Meld[]) => melds.reduce((n, m) => n + m.tiles.length + 1.6, 0);

/** `{1m}` token for a kind, as used in lesson texts. */
export const tok = (k: number) => `{${k < 27 ? `${(k % 9) + 1}${'mps'[Math.floor(k / 9)]}` : `${k - 26}z`}}`;
