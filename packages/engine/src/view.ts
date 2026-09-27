import type { Tile } from './tiles.ts';
import type { Meld, Seat } from './types.ts';
import { type DiscardOption, type TileCount, analyzeSeat } from './analysis.ts';
import {
  type Action,
  type Discard,
  type FinalStanding,
  type GameEvent,
  type GameState,
  type HandResult,
  legalActions,
  seatWindOf,
} from './game.ts';

export interface PublicPlayer {
  seat: Seat;
  /** 0 east - 3 north. */
  seatWind: number;
  score: number;
  handCount: number;
  melds: Meld[];
  discards: Discard[];
  riichi: boolean;
}

/** Everything one seat is allowed to know. Safe to send to that player's client. */
export interface PlayerView {
  seat: Seat;
  seq: number;
  phase: GameState['phase'];
  roundWind: number;
  dealer: Seat;
  honba: number;
  riichiSticks: number;
  wallCount: number;
  doraIndicators: Tile[];
  players: PublicPlayer[];
  /** Own concealed tiles (including the drawn tile) and the drawn tile. */
  hand: Tile[];
  drawn: Tile | null;
  /** Seat whose turn it is (null during a call window, to not leak who can call). */
  turn: Seat | null;
  /** Discard currently open for claims. */
  claimable: { seat: Seat; tile: Tile } | null;
  actions: Action[];
  /** Hints about the own hand, limited to the requested hint level (null when off or between hands). */
  hints: HandHints | null;
  result: HandResult | null;
  final: FinalStanding[] | null;
}

/**
 * How much the player is told about their own hand. The server picks the level (e.g. from the
 * player's rating or the table settings); anything above it is never sent, so the client cannot peek.
 *   off      nothing
 *   distance how far from winning: "5 away", "tenpai", "complete"
 *   waits    + winning tiles (with copies left) and furiten, between turns
 *   full     + tiles that improve the hand and a ranked list of discards
 */
export type HintLevel = 'off' | 'distance' | 'waits' | 'full';

export interface HandHints {
  level: HintLevel;
  /** Tiles still needed to win: 0 = complete, 1 = tenpai, 2 = one tile from tenpai, ... */
  tilesAway: number;
  /** Shanten: tilesAway - 1 (-1 complete, 0 tenpai). On own turn, after the best discard. */
  shanten: number;
  tenpai: boolean;
  complete: boolean;
  /** 'waits' and up; between turns only (empty on own turn). */
  waits?: TileCount[];
  furiten?: boolean;
  /** 'full' only. */
  ukeire?: TileCount[];
  total?: number;
  discards?: DiscardOption[] | null;
}

export interface ViewOptions {
  /** Default 'off'. */
  hints?: HintLevel;
}

export function handHints(g: GameState, seat: Seat, level: HintLevel): HandHints | null {
  if (level === 'off' || g.phase !== 'playing') return null;
  const a = analyzeSeat(g, seat);
  const onTurn = a.discards !== null;
  const hints: HandHints = {
    level,
    tilesAway: a.complete ? 0 : a.shanten + 1,
    shanten: a.complete ? -1 : a.shanten,
    tenpai: a.tenpai,
    complete: a.complete,
  };
  if (level === 'distance') return hints;
  hints.waits = onTurn ? [] : a.waits;
  hints.furiten = a.furiten;
  if (level === 'waits') return hints;
  return { ...hints, waits: a.waits, ukeire: a.ukeire, total: a.total, discards: a.discards };
}

export function viewFor(g: GameState, seat: Seat, opts: ViewOptions = {}): PlayerView {
  const h = g.hand;
  const me = h.players[seat];
  const step = h.step;
  return {
    seat,
    seq: g.seq,
    phase: g.phase,
    roundWind: g.roundWind,
    dealer: g.dealer,
    honba: g.honba,
    riichiSticks: g.riichiSticks,
    wallCount: h.wall.length,
    doraIndicators: h.doraIndicators.slice(0, h.doraRevealed),
    players: h.players.map((p, s) => ({
      seat: s,
      seatWind: seatWindOf(g, s),
      score: g.scores[s],
      handCount: p.hand.length,
      melds: p.melds,
      discards: p.discards,
      riichi: !!p.riichi,
    })),
    hand: [...me.hand],
    drawn: me.drawn,
    turn: step.type === 'turn' ? step.seat : null,
    claimable: step.type === 'calls' || step.type === 'chankan' ? { seat: step.seat, tile: step.tile } : null,
    actions: legalActions(g, seat),
    hints: handHints(g, seat, opts.hints ?? 'off'),
    result: g.result,
    final: g.final,
  };
}

/** Hides other players' private tiles from an event before sending it to `seat`. */
export function redactEvent(e: GameEvent, seat: Seat): GameEvent {
  switch (e.type) {
    case 'handStart':
      return { ...e, hands: e.hands.map((hand, s) => (s === seat ? hand : [])) };
    case 'draw':
      return e.seat === seat ? e : { ...e, tile: null };
    default:
      return e;
  }
}
