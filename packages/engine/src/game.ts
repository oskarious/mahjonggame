import { type Kind, type Tile, EAST, isDragon, isRedTile, isSuited, isWind, kindOf } from './tiles.ts';
import { countKinds, decomposeStandard, distinctTerminalsAndHonors, waits } from './hand.ts';
import { type RngState, seedRng, shuffle } from './rng.ts';
import type { RuleSet } from './rules.ts';
import { type HandValue, roundUp100, scoreHand } from './scoring.ts';
import type { Meld, Seat } from './types.ts';

// ---------------------------------------------------------------------------
// State

export interface Discard {
  tile: Tile;
  /** Discarded straight after drawing it. */
  tsumogiri: boolean;
  /** The riichi declaration tile. */
  riichi: boolean;
  /** Seat that claimed this discard into a meld. */
  calledBy: Seat | null;
}

export interface PlayerState {
  /** Concealed tiles, including the drawn tile. */
  hand: Tile[];
  /** The tile just drawn this turn (also in `hand`). */
  drawn: Tile | null;
  melds: Meld[];
  discards: Discard[];
  riichi: { double: boolean; ippatsu: boolean; accepted: boolean } | null;
  /** Missed a winning tile; cleared on the next draw or call. */
  tempFuriten: boolean;
  /** Missed a winning tile after riichi; lasts the rest of the hand. */
  riichiFuriten: boolean;
  /** Kinds that may not be discarded this turn (swap-calling). */
  kuikae: Kind[];
  /** Liability for big three dragons / big four winds. */
  pao: { daisangen: Seat | null; daisuushii: Seat | null };
}

export type Step =
  | { type: 'turn'; seat: Seat; afterCall: boolean; rinshan: boolean }
  | {
      type: 'calls';
      seat: Seat;
      tile: Tile;
      /** Legal responses per seat; empty for seats that cannot respond. */
      options: Action[][];
      /** Null while a seat still has to respond. */
      responses: (Action | null)[];
    }
  | {
      type: 'chankan';
      seat: Seat;
      tile: Tile;
      kind: Kind;
      options: Action[][];
      responses: (Action | null)[];
    }
  | { type: 'over' };

export interface HandState {
  /** Live wall; draws come from the front. */
  wall: Tile[];
  /** Replacement tiles for quads. */
  rinshan: Tile[];
  doraIndicators: Tile[];
  uraIndicators: Tile[];
  doraRevealed: number;
  /** Tiles moved from the live wall to the dead wall by quads. */
  deadExtra: Tile[];
  players: PlayerState[];
  step: Step;
  /** No call or quad has happened yet this hand. */
  uninterrupted: boolean;
  /** Seat of each declared quad, in order. */
  kans: Seat[];
  /** Seats that paid a riichi deposit this hand. */
  riichiDeposits: Seat[];
}

export interface WinRecord {
  seat: Seat;
  /** Discarder, or null for a self-draw. */
  from: Seat | null;
  winTile: Tile;
  /** Concealed tiles including the winning tile. */
  hand: Tile[];
  melds: Meld[];
  value: HandValue;
  pao: Seat | null;
}

export type AbortReason = 'nineTerminals' | 'fourWinds' | 'fourRiichi' | 'fourKans' | 'tripleRon';

export type HandResult =
  | { type: 'win'; wins: WinRecord[]; uraIndicators: Tile[]; deltas: number[] }
  | { type: 'exhaustive'; tenpai: boolean[]; hands: (Tile[] | null)[]; deltas: number[] }
  | { type: 'abortive'; reason: AbortReason; seat: Seat | null; deltas: number[] };

export interface FinalStanding {
  seat: Seat;
  points: number;
  rank: number;
  uma: number;
  /** (points - return points + uma) / 1000 */
  score: number;
}

export interface GameState {
  rules: RuleSet;
  rng: RngState;
  scores: number[];
  /** 0 = east round, 1 = south round. */
  roundWind: number;
  dealer: Seat;
  honba: number;
  /** Riichi deposits on the table (this hand's and leftovers). */
  riichiSticks: number;
  hand: HandState;
  phase: 'playing' | 'handOver' | 'gameOver';
  result: HandResult | null;
  /** How to continue after a hand ends. */
  next: { renchan: boolean; honba: number } | null;
  final: FinalStanding[] | null;
  /** Number of actions applied. */
  seq: number;
}

// ---------------------------------------------------------------------------
// Actions and events

export type Action =
  | { type: 'discard'; seat: Seat; tile: Tile; riichi?: boolean }
  | { type: 'tsumo'; seat: Seat }
  | { type: 'kan'; seat: Seat; kind: Kind }
  | { type: 'kyuushu'; seat: Seat }
  | { type: 'ron'; seat: Seat }
  | { type: 'pon'; seat: Seat; tiles: Tile[] }
  | { type: 'chii'; seat: Seat; tiles: Tile[] }
  | { type: 'daiminkan'; seat: Seat }
  | { type: 'pass'; seat: Seat }
  | { type: 'nextHand' };

export type GameEvent =
  | {
      type: 'handStart';
      roundWind: number;
      dealer: Seat;
      honba: number;
      riichiSticks: number;
      scores: number[];
      doraIndicator: Tile;
      /** Each seat's 13 starting tiles (redacted to the viewer's own). */
      hands: Tile[][];
    }
  | { type: 'draw'; seat: Seat; tile: Tile | null; rinshan: boolean }
  | { type: 'discard'; seat: Seat; tile: Tile; tsumogiri: boolean; riichi: boolean }
  | { type: 'riichiAccepted'; seat: Seat; scores: number[] }
  | { type: 'call'; seat: Seat; meld: Meld }
  | { type: 'kanAttempt'; seat: Seat; tile: Tile }
  | { type: 'kan'; seat: Seat; meld: Meld }
  | { type: 'dora'; indicator: Tile }
  | { type: 'handEnd'; result: HandResult; scores: number[] }
  | { type: 'gameEnd'; final: FinalStanding[] };

export interface Transition {
  state: GameState;
  events: GameEvent[];
}

export class IllegalActionError extends Error {}

// ---------------------------------------------------------------------------
// Public API

export function createGame(rules: RuleSet, seed: string): Transition {
  const events: GameEvent[] = [];
  const g: GameState = {
    rules: structuredClone(rules),
    rng: seedRng(seed),
    scores: [0, 1, 2, 3].map(() => rules.startingPoints),
    roundWind: 0,
    dealer: 0,
    honba: 0,
    riichiSticks: 0,
    hand: emptyHand(),
    phase: 'playing',
    result: null,
    next: null,
    final: null,
    seq: 0,
  };
  startHand(g, events);
  return { state: g, events };
}

/** Applies an action to a copy of the state. Throws IllegalActionError if not legal. */
export function applyAction(state: GameState, action: Action): Transition {
  const g = structuredClone(state);
  const ev: GameEvent[] = [];
  if (action.type === 'nextHand') {
    if (g.phase !== 'handOver') throw new IllegalActionError('No hand to advance to');
    const { renchan, honba } = g.next!;
    if (!renchan) {
      g.dealer = (g.dealer + 1) % 4;
      if (g.dealer === 0) g.roundWind++;
    }
    g.honba = honba;
    g.next = null;
    startHand(g, ev);
  } else {
    const key = actionKey(action);
    if (!legalActions(g, action.seat).some((a) => actionKey(a) === key)) {
      throw new IllegalActionError(`Illegal action: ${JSON.stringify(action)}`);
    }
    const p = g.hand.players[action.seat];
    switch (action.type) {
      case 'discard':
        discard(g, action.seat, action.tile, !!action.riichi, ev);
        break;
      case 'tsumo':
        win(g, [action.seat], null, p.drawn!, false, ev);
        break;
      case 'kan':
        declareKan(g, action.seat, action.kind, ev);
        break;
      case 'kyuushu':
        abortHand(g, 'nineTerminals', action.seat, ev);
        break;
      default:
        respond(g, action, ev);
    }
  }
  g.seq++;
  return { state: g, events: ev };
}

/** Every action `seat` may take right now. */
export function legalActions(g: GameState, seat: Seat): Action[] {
  if (g.phase !== 'playing') return [];
  const step = g.hand.step;
  switch (step.type) {
    case 'turn':
      return step.seat === seat ? turnActions(g, seat) : [];
    case 'calls':
    case 'chankan':
      return step.responses[seat] === null ? step.options[seat] : [];
    default:
      return [];
  }
}

/** Seats the game is waiting on. */
export function pendingSeats(g: GameState): Seat[] {
  if (g.phase !== 'playing') return [];
  const step = g.hand.step;
  if (step.type === 'turn') return [step.seat];
  if (step.type === 'calls' || step.type === 'chankan') {
    return [0, 1, 2, 3].filter((s) => step.responses[s] === null);
  }
  return [];
}

/** What to do when a seat runs out of time: pass calls, otherwise discard the drawn tile. */
export function timeoutAction(g: GameState, seat: Seat): Action | null {
  const legal = legalActions(g, seat);
  if (!legal.length) return null;
  const pass = legal.find((a) => a.type === 'pass');
  if (pass) return pass;
  const discards = legal.filter((a): a is Extract<Action, { type: 'discard' }> => a.type === 'discard' && !a.riichi);
  const drawn = g.hand.players[seat].drawn;
  return discards.find((a) => a.tile === drawn) ?? discards[discards.length - 1] ?? legal[0];
}

export function seatWindOf(g: GameState, seat: Seat): number {
  return (seat - g.dealer + 4) % 4;
}

/** Winning kinds for a player between turns (13 - 3 * melds concealed tiles). */
export function waitsOf(p: PlayerState): Kind[] {
  return waits(p.hand, p.melds);
}

export function isFuriten(p: PlayerState): boolean {
  if (p.tempFuriten || p.riichiFuriten) return true;
  const w = waitsOf(p);
  return p.discards.some((d) => w.includes(kindOf(d.tile)));
}

export function actionKey(a: Action): string {
  switch (a.type) {
    case 'discard':
      return `discard:${a.seat}:${a.tile}:${a.riichi ? 1 : 0}`;
    case 'kan':
      return `kan:${a.seat}:${a.kind}`;
    case 'pon':
    case 'chii':
      return `${a.type}:${a.seat}:${[...a.tiles].sort((x, y) => x - y).join(',')}`;
    case 'nextHand':
      return 'nextHand';
    default:
      return `${a.type}:${a.seat}`;
  }
}

// ---------------------------------------------------------------------------
// Hand flow

function emptyHand(): HandState {
  return {
    wall: [],
    rinshan: [],
    doraIndicators: [],
    uraIndicators: [],
    doraRevealed: 0,
    deadExtra: [],
    players: [],
    step: { type: 'over' },
    uninterrupted: true,
    kans: [],
    riichiDeposits: [],
  };
}

function newPlayer(): PlayerState {
  return {
    hand: [],
    drawn: null,
    melds: [],
    discards: [],
    riichi: null,
    tempFuriten: false,
    riichiFuriten: false,
    kuikae: [],
    pao: { daisangen: null, daisuushii: null },
  };
}

function startHand(g: GameState, ev: GameEvent[]): void {
  const tiles = shuffle(
    g.rng,
    Array.from({ length: 136 }, (_, i) => i),
  );
  const dead = tiles.splice(tiles.length - 14, 14);
  const players = [0, 1, 2, 3].map(newPlayer);
  for (let i = 0; i < 13; i++) {
    for (let s = 0; s < 4; s++) players[(g.dealer + s) % 4].hand.push(tiles.shift()!);
  }
  g.hand = {
    ...emptyHand(),
    wall: tiles,
    rinshan: dead.slice(0, 4),
    doraIndicators: dead.slice(4, 9),
    uraIndicators: dead.slice(9, 14),
    doraRevealed: 1,
    players,
  };
  g.phase = 'playing';
  g.result = null;
  ev.push({
    type: 'handStart',
    roundWind: g.roundWind,
    dealer: g.dealer,
    honba: g.honba,
    riichiSticks: g.riichiSticks,
    scores: [...g.scores],
    doraIndicator: g.hand.doraIndicators[0],
    hands: players.map((p) => [...p.hand]),
  });
  draw(g, g.dealer, false, ev);
}

function draw(g: GameState, seat: Seat, rinshan: boolean, ev: GameEvent[]): void {
  const h = g.hand;
  const p = h.players[seat];
  const t = rinshan ? h.rinshan.shift()! : h.wall.shift()!;
  p.hand.push(t);
  p.drawn = t;
  p.tempFuriten = false;
  h.step = { type: 'turn', seat, afterCall: false, rinshan };
  ev.push({ type: 'draw', seat, tile: t, rinshan });
}

function isClosed(p: PlayerState): boolean {
  return p.melds.every((m) => m.type === 'ankan');
}

function removeTiles(hand: Tile[], tiles: Tile[]): void {
  for (const t of tiles) {
    const i = hand.indexOf(t);
    if (i < 0) throw new Error(`Tile ${t} not in hand`);
    hand.splice(i, 1);
  }
}

/** Nobody can claim ippatsu or first-turn bonuses after a call or quad. */
function interrupt(h: HandState): void {
  h.uninterrupted = false;
  for (const p of h.players) if (p.riichi) p.riichi.ippatsu = false;
}

function revealDora(g: GameState, ev: GameEvent[]): void {
  const h = g.hand;
  h.doraRevealed++;
  ev.push({ type: 'dora', indicator: h.doraIndicators[h.doraRevealed - 1] });
}

function scoreWin(
  g: GameState,
  seat: Seat,
  concealed: Tile[],
  winTile: Tile,
  tsumo: boolean,
  chankan: boolean,
): HandValue | null {
  const h = g.hand;
  const p = h.players[seat];
  const dealer = seat === g.dealer;
  const rinshan = tsumo && h.step.type === 'turn' && h.step.rinshan;
  const firstTurn = h.uninterrupted && p.discards.length === 0;
  return scoreHand(
    {
      concealed,
      melds: p.melds,
      winTile,
      tsumo,
      seatWind: EAST + seatWindOf(g, seat),
      roundWind: EAST + g.roundWind,
      dealer,
      riichi: p.riichi ? (p.riichi.double ? 'double' : 'riichi') : 'none',
      ippatsu: !!p.riichi?.ippatsu,
      rinshan,
      chankan,
      haitei: tsumo && !rinshan && h.wall.length === 0,
      houtei: !tsumo && !chankan && h.wall.length === 0,
      tenhou: tsumo && dealer && firstTurn,
      chiihou: tsumo && !dealer && firstTurn,
      renhou: !tsumo && !dealer && firstTurn,
      doraIndicators: h.doraIndicators.slice(0, h.doraRevealed),
      uraIndicators: h.uraIndicators.slice(0, h.doraRevealed),
    },
    g.rules,
  );
}

function ronValue(g: GameState, seat: Seat, tile: Tile, chankan: boolean): HandValue | null {
  const p = g.hand.players[seat];
  if (isFuriten(p)) return null;
  return scoreWin(g, seat, [...p.hand, tile], tile, false, chankan);
}

// ---------------------------------------------------------------------------
// Own turn

function turnActions(g: GameState, seat: Seat): Action[] {
  const h = g.hand;
  const p = h.players[seat];
  const step = h.step as Extract<Step, { type: 'turn' }>;
  const rules = g.rules;
  const out: Action[] = [];

  if (!step.afterCall) {
    if (p.drawn !== null && scoreWin(g, seat, p.hand, p.drawn, true, false)) out.push({ type: 'tsumo', seat });
    for (const kind of kanKinds(g, seat)) out.push({ type: 'kan', seat, kind });
    if (
      rules.abortiveDraws.nineTerminals &&
      h.uninterrupted &&
      p.discards.length === 0 &&
      distinctTerminalsAndHonors(p.hand) >= 9
    ) {
      out.push({ type: 'kyuushu', seat });
    }
  }

  const candidates = p.riichi ? [p.drawn!] : p.hand.filter((t) => !p.kuikae.includes(kindOf(t)));
  for (const tile of candidates) out.push({ type: 'discard', seat, tile });

  const canRiichi =
    !p.riichi &&
    !step.afterCall &&
    isClosed(p) &&
    h.wall.length >= rules.riichiMinWallTiles &&
    (!rules.riichiNeedsPoints || g.scores[seat] >= rules.riichiDeposit);
  if (canRiichi) {
    const tenpaiByKind = new Map<Kind, boolean>();
    for (const tile of candidates) {
      const k = kindOf(tile);
      if (!tenpaiByKind.has(k)) {
        const rest = p.hand.filter((t) => t !== tile);
        tenpaiByKind.set(k, waits(rest, p.melds).length > 0);
      }
      if (tenpaiByKind.get(k)) out.push({ type: 'discard', seat, tile, riichi: true });
    }
  }
  return out;
}

function kanKinds(g: GameState, seat: Seat): Kind[] {
  const h = g.hand;
  const p = h.players[seat];
  if (h.kans.length >= 4 || h.wall.length === 0) return [];
  const c = countKinds(p.hand);
  const out: Kind[] = [];
  for (let k = 0; k < c.length; k++) {
    if (c[k] === 4 && (!p.riichi || riichiAnkanAllowed(p, k))) out.push(k);
  }
  if (!p.riichi) {
    for (const m of p.melds) {
      const k = kindOf(m.tiles[0]);
      if (m.type === 'pon' && c[k] >= 1) out.push(k);
    }
  }
  return out;
}

/**
 * After riichi a concealed quad is allowed only with the drawn tile, if it does not change the
 * waits, and if the three tiles can only be read as a triplet in every winning hand.
 */
function riichiAnkanAllowed(p: PlayerState, kind: Kind): boolean {
  if (p.drawn === null || kindOf(p.drawn) !== kind) return false;
  const before = p.hand.filter((t) => t !== p.drawn);
  const beforeCounts = countKinds(before);
  if (beforeCounts[kind] !== 3) return false;
  const w0 = waits(before, p.melds);
  const quad: Meld = { type: 'ankan', tiles: p.hand.filter((t) => kindOf(t) === kind), called: null, from: null };
  const w1 = waits(
    before.filter((t) => kindOf(t) !== kind),
    [...p.melds, quad],
  );
  if (w0.length !== w1.length || w0.some((k, i) => k !== w1[i])) return false;
  for (const w of w0) {
    const c = beforeCounts.slice();
    c[w]++;
    for (const shape of decomposeStandard(c)) {
      if (!shape.groups.some((gr) => gr.type === 'trip' && gr.kind === kind)) return false;
    }
  }
  return true;
}

function discard(g: GameState, seat: Seat, tile: Tile, riichi: boolean, ev: GameEvent[]): void {
  const h = g.hand;
  const p = h.players[seat];
  removeTiles(p.hand, [tile]);
  const tsumogiri = tile === p.drawn;
  p.drawn = null;
  p.kuikae = [];
  if (riichi) p.riichi = { double: h.uninterrupted && p.discards.length === 0, ippatsu: true, accepted: false };
  else if (p.riichi) p.riichi.ippatsu = false;
  p.discards.push({ tile, tsumogiri, riichi, calledBy: null });
  ev.push({ type: 'discard', seat, tile, tsumogiri, riichi });
  openCalls(g, seat, tile, ev);
}

function declareKan(g: GameState, seat: Seat, kind: Kind, ev: GameEvent[]): void {
  const h = g.hand;
  const p = h.players[seat];
  const tiles = p.hand.filter((t) => kindOf(t) === kind);
  const concealed = tiles.length === 4;
  const tile = tiles[tiles.length - 1];
  if (!concealed || g.rules.kokushiRobsConcealedKan) {
    const options = [0, 1, 2, 3].map((s): Action[] => {
      if (s === seat) return [];
      const v = ronValue(g, s, tile, true);
      if (!v || (concealed && !v.yakuman.some((y) => y.id === 'kokushi'))) return [];
      return [
        { type: 'ron', seat: s },
        { type: 'pass', seat: s },
      ];
    });
    if (options.some((o) => o.length)) {
      ev.push({ type: 'kanAttempt', seat, tile });
      h.step = {
        type: 'chankan',
        seat,
        tile,
        kind,
        options,
        responses: options.map((o, s) => (o.length ? null : { type: 'pass', seat: s })),
      };
      return;
    }
  }
  if (!concealed) markMissedWins(g, seat, tile, []);
  completeKan(g, seat, kind, ev);
}

function completeKan(g: GameState, seat: Seat, kind: Kind, ev: GameEvent[]): void {
  const h = g.hand;
  const p = h.players[seat];
  const tiles = p.hand.filter((t) => kindOf(t) === kind);
  removeTiles(p.hand, tiles);
  let meld: Meld;
  if (tiles.length === 4) {
    meld = { type: 'ankan', tiles, called: null, from: null };
    p.melds.push(meld);
  } else {
    meld = p.melds.find((m) => m.type === 'pon' && kindOf(m.tiles[0]) === kind)!;
    meld.type = 'shouminkan';
    meld.tiles.push(tiles[0]);
    meld.added = tiles[0];
  }
  p.drawn = null;
  h.kans.push(seat);
  interrupt(h);
  ev.push({ type: 'kan', seat, meld: structuredClone(meld) });
  revealDora(g, ev);
  h.deadExtra.push(h.wall.pop()!);
  draw(g, seat, true, ev);
}

// ---------------------------------------------------------------------------
// Call window

function uniqueByRed(g: GameState, tiles: Tile[]): Tile[] {
  const seen = new Set<string>();
  return tiles.filter((t) => {
    const key = `${kindOf(t)}:${isRedTile(t, g.rules.redFives)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Kinds that may not be discarded after a chii (the called kind, and the other end of the sequence). */
function chiiBan(called: Kind, a: Kind, b: Kind): Kind[] {
  const low = Math.min(called, a, b);
  const ban = [called];
  if (called === low && low % 9 <= 5) ban.push(low + 3);
  if (called === low + 2 && low % 9 >= 1) ban.push(low - 1);
  return ban;
}

function hasDiscardAfter(hand: Tile[], used: Tile[], ban: Kind[]): boolean {
  const rest = hand.filter((t) => !used.includes(t));
  return rest.some((t) => !ban.includes(kindOf(t)));
}

function callOptions(g: GameState, seat: Seat, discarder: Seat, tile: Tile): Action[] {
  const h = g.hand;
  const p = h.players[seat];
  const k = kindOf(tile);
  const out: Action[] = [];
  if (ronValue(g, seat, tile, false)) out.push({ type: 'ron', seat });

  // The last discard can only be claimed for a win; riichi hands cannot call.
  if (h.wall.length > 0 && !p.riichi) {
    const same = p.hand.filter((t) => kindOf(t) === k);
    const seenPairs = new Set<string>();
    for (let i = 0; i < same.length; i++) {
      for (let j = i + 1; j < same.length; j++) {
        const pair = [same[i], same[j]];
        const key = pair
          .map((t) => isRedTile(t, g.rules.redFives))
          .sort()
          .join();
        if (seenPairs.has(key)) continue;
        seenPairs.add(key);
        if (hasDiscardAfter(p.hand, pair, [k])) out.push({ type: 'pon', seat, tiles: pair });
      }
    }
    if (same.length >= 3 && h.kans.length < 4) out.push({ type: 'daiminkan', seat });

    if (seat === (discarder + 1) % 4 && isSuited(k)) {
      const r = k % 9;
      const shapes: [Kind, Kind][] = [];
      if (r >= 2) shapes.push([k - 2, k - 1]);
      if (r >= 1 && r <= 7) shapes.push([k - 1, k + 1]);
      if (r <= 6) shapes.push([k + 1, k + 2]);
      for (const [a, b] of shapes) {
        const ta = uniqueByRed(
          g,
          p.hand.filter((t) => kindOf(t) === a),
        );
        const tb = uniqueByRed(
          g,
          p.hand.filter((t) => kindOf(t) === b),
        );
        const ban = chiiBan(k, a, b);
        for (const x of ta) {
          for (const y of tb) {
            if (hasDiscardAfter(p.hand, [x, y], ban)) out.push({ type: 'chii', seat, tiles: [x, y] });
          }
        }
      }
    }
  }
  if (out.length) out.push({ type: 'pass', seat });
  return out;
}

function openCalls(g: GameState, discarder: Seat, tile: Tile, ev: GameEvent[]): void {
  const options = [0, 1, 2, 3].map((s) => (s === discarder ? [] : callOptions(g, s, discarder, tile)));
  if (options.every((o) => !o.length)) {
    markMissedWins(g, discarder, tile, []);
    afterDiscard(g, discarder, tile, [], ev);
    return;
  }
  g.hand.step = {
    type: 'calls',
    seat: discarder,
    tile,
    options,
    responses: options.map((o, s) => (o.length ? null : { type: 'pass', seat: s })),
  };
}

function respond(g: GameState, action: Action, ev: GameEvent[]): void {
  const step = g.hand.step;
  if (step.type !== 'calls' && step.type !== 'chankan') throw new Error('Not in a call window');
  if (action.type === 'nextHand') throw new Error('Unexpected action');
  step.responses[action.seat] = action;
  if (step.responses.some((r) => r === null)) return;

  const order = [1, 2, 3].map((i) => (step.seat + i) % 4);
  const rons = order.filter((s) => step.responses[s]!.type === 'ron');
  markMissedWins(g, step.seat, step.tile, rons);

  if (rons.length) {
    if (rons.length === 3 && g.rules.abortiveDraws.tripleRon) {
      abortHand(g, 'tripleRon', null, ev);
      return;
    }
    const winners = g.rules.multipleRon ? rons : [rons[0]];
    win(g, winners, step.seat, step.tile, step.type === 'chankan', ev);
    return;
  }
  if (step.type === 'chankan') {
    completeKan(g, step.seat, step.kind, ev);
    return;
  }
  afterDiscard(g, step.seat, step.tile, step.responses, ev);
}

/** Players who could have won on this tile but did not become furiten. */
function markMissedWins(g: GameState, source: Seat, tile: Tile, winners: Seat[]): void {
  const k = kindOf(tile);
  g.hand.players.forEach((p, s) => {
    if (s === source || winners.includes(s)) return;
    if (!waitsOf(p).includes(k)) return;
    if (p.riichi) p.riichiFuriten = true;
    else p.tempFuriten = true;
  });
}

function afterDiscard(g: GameState, discarder: Seat, tile: Tile, responses: (Action | null)[], ev: GameEvent[]): void {
  const h = g.hand;
  const rules = g.rules;
  acceptRiichi(g, discarder, ev);

  if (rules.abortiveDraws.fourRiichi && h.players.every((p) => p.riichi?.accepted)) {
    abortHand(g, 'fourRiichi', null, ev);
    return;
  }
  if (rules.abortiveDraws.fourWinds && h.uninterrupted && h.players.every((p) => p.discards.length === 1)) {
    const first = h.players.map((p) => kindOf(p.discards[0].tile));
    if (isWind(first[0]) && first.every((k) => k === first[0])) {
      abortHand(g, 'fourWinds', null, ev);
      return;
    }
  }
  if (rules.abortiveDraws.fourKans && h.kans.length === 4 && new Set(h.kans).size > 1) {
    abortHand(g, 'fourKans', null, ev);
    return;
  }

  const order = [1, 2, 3].map((i) => (discarder + i) % 4);
  const call =
    order.map((s) => responses[s]).find((r) => r?.type === 'pon' || r?.type === 'daiminkan') ??
    order.map((s) => responses[s]).find((r) => r?.type === 'chii');
  if (call) {
    applyCall(g, call, discarder, tile, ev);
    return;
  }
  if (h.wall.length === 0) {
    exhaustiveDraw(g, ev);
    return;
  }
  draw(g, (discarder + 1) % 4, false, ev);
}

function acceptRiichi(g: GameState, seat: Seat, ev: GameEvent[]): void {
  const p = g.hand.players[seat];
  if (!p.riichi || p.riichi.accepted) return;
  p.riichi.accepted = true;
  g.scores[seat] -= g.rules.riichiDeposit;
  g.riichiSticks++;
  g.hand.riichiDeposits.push(seat);
  ev.push({ type: 'riichiAccepted', seat, scores: [...g.scores] });
}

function applyCall(g: GameState, call: Action, discarder: Seat, tile: Tile, ev: GameEvent[]): void {
  if (call.type !== 'pon' && call.type !== 'chii' && call.type !== 'daiminkan') throw new Error('Not a call');
  const h = g.hand;
  const seat = call.seat;
  const p = h.players[seat];
  const k = kindOf(tile);
  const own = call.type === 'daiminkan' ? p.hand.filter((t) => kindOf(t) === k) : call.tiles;
  removeTiles(p.hand, own);
  const meld: Meld = { type: call.type, tiles: [...own, tile], called: tile, from: discarder };
  const discards = h.players[discarder].discards;
  discards[discards.length - 1].calledBy = seat;
  p.melds.push(meld);
  p.tempFuriten = false;
  interrupt(h);

  const triplets = p.melds.filter((m) => m.type !== 'chii').map((m) => kindOf(m.tiles[0]));
  if (isDragon(k) && triplets.filter(isDragon).length === 3) p.pao.daisangen = discarder;
  if (isWind(k) && triplets.filter(isWind).length === 4) p.pao.daisuushii = discarder;

  ev.push({ type: 'call', seat, meld: structuredClone(meld) });
  if (call.type === 'daiminkan') {
    h.kans.push(seat);
    revealDora(g, ev);
    h.deadExtra.push(h.wall.pop()!);
    draw(g, seat, true, ev);
  } else {
    p.kuikae = call.type === 'pon' ? [k] : chiiBan(k, kindOf(own[0]), kindOf(own[1]));
    h.step = { type: 'turn', seat, afterCall: true, rinshan: false };
  }
}

// ---------------------------------------------------------------------------
// End of hand

function win(g: GameState, winners: Seat[], from: Seat | null, tile: Tile, chankan: boolean, ev: GameEvent[]): void {
  const h = g.hand;
  const rules = g.rules;
  const deltas = [0, 0, 0, 0];
  const wins: WinRecord[] = [];
  const tsumo = from === null;

  for (const w of winners) {
    const p = h.players[w];
    const concealed = tsumo ? [...p.hand] : [...p.hand, tile];
    const value = scoreWin(g, w, concealed, tile, tsumo, chankan)!;
    const dealer = w === g.dealer;
    const base = value.basePoints;
    const honba = tsumo || rules.honbaToAllRonWinners || w === winners[0] ? g.honba : 0;
    const pay = (s: Seat, amount: number) => {
      deltas[s] -= amount;
      deltas[w] += amount;
    };
    const ids = value.yakuman.map((y) => y.id);
    const pao = ids.includes('daisangen')
      ? p.pao.daisangen
      : ids.includes('daisuushii')
        ? p.pao.daisuushii
        : null;

    if (tsumo) {
      if (pao !== null) {
        pay(pao, roundUp100(base * (dealer ? 6 : 4)) + honba * rules.honbaValue);
      } else {
        for (let s = 0; s < 4; s++) {
          if (s === w) continue;
          pay(s, roundUp100(base * (dealer || s === g.dealer ? 2 : 1)) + (honba * rules.honbaValue) / 3);
        }
      }
    } else {
      const full = roundUp100(base * (dealer ? 6 : 4));
      if (pao !== null && pao !== from) {
        pay(from, full / 2 + honba * rules.honbaValue);
        pay(pao, full / 2);
      } else {
        pay(from, full + honba * rules.honbaValue);
      }
    }
    wins.push({ seat: w, from, winTile: tile, hand: concealed, melds: structuredClone(p.melds), value, pao });
  }

  // Winners get their own deposit from this hand back; the rest goes to the first winner after the discarder.
  let sticks = g.riichiSticks;
  for (const w of winners) {
    if (h.riichiDeposits.includes(w)) {
      deltas[w] += rules.riichiDeposit;
      sticks--;
    }
  }
  deltas[winners[0]] += sticks * rules.riichiDeposit;
  g.riichiSticks = 0;

  for (let s = 0; s < 4; s++) g.scores[s] += deltas[s];
  const renchan = winners.includes(g.dealer);
  const anyRiichi = winners.some((w) => h.players[w].riichi);
  endHand(
    g,
    { type: 'win', wins, uraIndicators: anyRiichi ? h.uraIndicators.slice(0, h.doraRevealed) : [], deltas },
    renchan,
    renchan ? g.honba + 1 : 0,
    ev,
  );
}

function exhaustiveDraw(g: GameState, ev: GameEvent[]): void {
  const players = g.hand.players;
  const tenpai = players.map((p) => waitsOf(p).length > 0);
  const n = tenpai.filter(Boolean).length;
  const deltas = [0, 0, 0, 0];
  if (n > 0 && n < 4) {
    for (let s = 0; s < 4; s++) {
      deltas[s] = tenpai[s] ? g.rules.notenPenalty / n : -g.rules.notenPenalty / (4 - n);
      g.scores[s] += deltas[s];
    }
  }
  endHand(
    g,
    { type: 'exhaustive', tenpai, hands: players.map((p, s) => (tenpai[s] ? [...p.hand] : null)), deltas },
    tenpai[g.dealer],
    g.honba + 1,
    ev,
  );
}

function abortHand(g: GameState, reason: AbortReason, seat: Seat | null, ev: GameEvent[]): void {
  endHand(g, { type: 'abortive', reason, seat, deltas: [0, 0, 0, 0] }, true, g.honba + 1, ev);
}

function endHand(g: GameState, result: HandResult, renchan: boolean, honba: number, ev: GameEvent[]): void {
  g.hand.step = { type: 'over' };
  g.result = result;
  g.next = { renchan, honba };
  ev.push({ type: 'handEnd', result, scores: [...g.scores] });

  const lastRound = g.rules.length === 'east' ? 0 : 1;
  const bankrupt = g.rules.bankruptcy && g.scores.some((s) => s < 0);
  const roundsDone = !renchan && (g.dealer + 1) % 4 === 0 && g.roundWind >= lastRound;
  if (bankrupt || roundsDone) finishGame(g, ev);
  else g.phase = 'handOver';
}

function finishGame(g: GameState, ev: GameEvent[]): void {
  const rules = g.rules;
  g.phase = 'gameOver';
  g.next = null;

  // Leftover deposits go to the leader(s), split and rounded down.
  const top = Math.max(...g.scores);
  const leaders = [0, 1, 2, 3].filter((s) => g.scores[s] === top);
  if (g.riichiSticks) {
    const share = Math.floor((g.riichiSticks * rules.riichiDeposit) / leaders.length);
    for (const s of leaders) g.scores[s] += share;
    g.riichiSticks = 0;
  }

  const order = [0, 1, 2, 3].sort((a, b) => g.scores[b] - g.scores[a] || a - b);
  const final: FinalStanding[] = [];
  for (let i = 0; i < 4; ) {
    let j = i + 1;
    if (rules.tieBreak === 'split') while (j < 4 && g.scores[order[j]] === g.scores[order[i]]) j++;
    const uma = rules.uma.slice(i, j).reduce((a, b) => a + b, 0) / (j - i);
    for (let k = i; k < j; k++) {
      const seat = order[k];
      const points = g.scores[seat];
      final.push({ seat, points, rank: i + 1, uma, score: (points - rules.returnPoints + uma) / 1000 });
    }
    i = j;
  }
  g.final = final;
  ev.push({ type: 'gameEnd', final });
}
