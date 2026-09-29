import {
  type Action,
  DEFAULT_RULES,
  EAST,
  EMA_2025,
  type GameEvent,
  type GameState,
  type HandValue,
  type Meld,
  type MeldType,
  type PlayerState,
  type RuleSet,
  SOUTH,
  type Seat,
  type Tile,
  type WinContext,
  applyAction,
  createGame,
  isRedTile,
  kindOf,
  legalActions,
  parseTiles,
  pendingSeats,
  scoreHand,
} from '../src/index.ts';

// ---------------------------------------------------------------------------
// Direct hand scoring

export interface ScoreOpts extends Partial<Omit<WinContext, 'concealed' | 'melds' | 'winTile' | 'doraIndicators' | 'uraIndicators'>> {
  melds?: [MeldType, string][];
  dora?: string;
  ura?: string;
  rules?: RuleSet;
}

/**
 * Scores `hand` (concealed tiles, winning tile last). Defaults: EMA rules, South seat in the
 * east round, non-dealer, ron, no riichi.
 */
export function score(hand: string, opts: ScoreOpts = {}): HandValue | null {
  const used = new Set<Tile>();
  const concealed = parseTiles(hand, used);
  const melds = (opts.melds ?? []).map(([type, s]) => makeMeld(type, parseTiles(s, used), 0));
  if (concealed.length + 3 * melds.length !== 14) {
    throw new Error(`Hand ${hand} has ${concealed.length} concealed tiles and ${melds.length} melds`);
  }
  const { melds: _m, dora, ura, rules, ...rest } = opts;
  return scoreHand(
    {
      concealed,
      melds,
      winTile: concealed[concealed.length - 1],
      tsumo: false,
      seatWind: SOUTH,
      roundWind: EAST,
      dealer: false,
      riichi: 'none',
      ippatsu: false,
      rinshan: false,
      chankan: false,
      haitei: false,
      houtei: false,
      tenhou: false,
      chiihou: false,
      renhou: false,
      doraIndicators: dora ? parseTiles(dora, used) : [],
      uraIndicators: ura ? parseTiles(ura, used) : [],
      ...rest,
    },
    rules ?? EMA_2025,
  );
}

export const yakuOf = (v: HandValue | null) => (v ? v.yaku.map((y) => y.id).sort() : null);
export const hanOf = (v: HandValue | null, id: string) => v?.yaku.find((y) => y.id === id)?.han ?? 0;
export const yakumanOf = (v: HandValue | null) => (v ? v.yakuman.map((y) => y.id) : null);

function makeMeld(type: MeldType, tiles: Tile[], from: Seat): Meld {
  if (type === 'ankan') return { type, tiles, called: null, from: null };
  return { type, tiles, called: tiles[0], from, ...(type === 'shouminkan' ? { added: tiles[3] } : {}) };
}

// ---------------------------------------------------------------------------
// Rigged games

export interface RigOptions {
  rules?: RuleSet;
  /** Concealed tiles per seat (13 - 3 * melds); missing tiles are filled with junk. */
  hands?: (string | undefined)[];
  /** Melds per seat; claimed melds are recorded as called from the seat to the left. */
  melds?: [MeldType, string][][];
  /** Earlier discards per seat. */
  discards?: (string | undefined)[];
  /** Live wall from the front, space separated; '?' is a junk tile. The first is drawn by `turn`. */
  draws?: string;
  rinshan?: string;
  /** Dora indicator(s); defaults to west (north is dora). */
  dora?: string;
  ura?: string;
  /** Live wall length before the first draw. */
  wallSize?: number;
  dealer?: Seat;
  /** Seat that draws first (defaults to the dealer). */
  turn?: Seat;
  roundWind?: number;
  honba?: number;
  riichiSticks?: number;
  scores?: number[];
  /** Seats already in riichi this hand (deposit paid). */
  riichi?: Seat[];
  /** Whether no call has happened yet (first-turn yaku, double riichi, abortive draws). Default false. */
  uninterrupted?: boolean;
}

export function rig(o: RigOptions): GameState {
  const rules = o.rules ?? DEFAULT_RULES;
  const used = new Set<Tile>();
  const parse = (s?: string) => (s ? parseTiles(s, used) : []);

  const hands = [0, 1, 2, 3].map((s) => parse(o.hands?.[s]));
  const melds = [0, 1, 2, 3].map((s) =>
    (o.melds?.[s] ?? []).map(([type, str]) => makeMeld(type, parse(str), (s + 3) % 4)),
  );
  const discards = [0, 1, 2, 3].map((s) => parse(o.discards?.[s]));
  const drawTokens = (o.draws ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => (t === '?' ? null : parse(t)[0]));
  const rinshan = parse(o.rinshan);
  const dora = parse(o.dora ?? '3z');
  const ura = parse(o.ura ?? '3z');

  // Junk: cycle through spread-out kinds, red fives last, so filler hands stay far from tenpai.
  const pool = Array.from({ length: 136 }, (_, i) => i)
    .filter((t) => !used.has(t))
    .sort((a, b) => (b & 3) - (a & 3) || ((kindOf(a) * 13) % 34) - ((kindOf(b) * 13) % 34));
  const take = () => {
    const t = pool.shift();
    if (t === undefined) throw new Error('Out of tiles');
    return t;
  };
  hands.forEach((h, s) => {
    const size = 13 - 3 * melds[s].length;
    if (h.length > size) throw new Error(`Seat ${s} has ${h.length} tiles, expected ${size}`);
    while (h.length < size) h.push(take());
  });
  const draws = drawTokens.map((t) => t ?? take());
  while (rinshan.length < 4) rinshan.push(take());
  while (dora.length < 5) dora.push(take());
  while (ura.length < 5) ura.push(take());
  const wall = [...draws, ...pool.splice(0)];
  const deadExtra: Tile[] = [];
  if (o.wallSize !== undefined) deadExtra.push(...wall.splice(o.wallSize));

  const kans: Seat[] = [];
  melds.forEach((ms, s) => ms.forEach((m) => m.tiles.length === 4 && kans.push(s)));
  deadExtra.push(...rinshan.splice(0, kans.length));

  const g = createGame(rules, 'rig').state;
  g.dealer = o.dealer ?? 0;
  g.roundWind = o.roundWind ?? 0;
  g.honba = o.honba ?? 0;
  g.riichiSticks = o.riichiSticks ?? 0;
  g.scores = o.scores ? [...o.scores] : [0, 1, 2, 3].map(() => rules.startingPoints);
  for (const s of o.riichi ?? []) {
    if (!o.scores) g.scores[s] -= rules.riichiDeposit;
    g.riichiSticks++;
  }
  const players: PlayerState[] = hands.map((hand, s) => ({
    hand,
    drawn: null,
    melds: melds[s],
    discards: discards[s].map((tile) => ({ tile, tsumogiri: false, riichi: false, calledBy: null })),
    riichi: o.riichi?.includes(s) ? { double: false, ippatsu: false, accepted: true } : null,
    tempFuriten: false,
    riichiFuriten: false,
    kuikae: [],
    pao: { daisangen: null, daisuushii: null },
  }));
  g.hand = {
    wall,
    rinshan,
    doraIndicators: dora,
    uraIndicators: ura,
    doraRevealed: 1 + kans.length,
    deadExtra,
    players,
    step: { type: 'over' },
    uninterrupted: o.uninterrupted ?? false,
    kans,
    riichiDeposits: [...(o.riichi ?? [])],
    lastDiscard: null,
  };
  g.phase = 'playing';
  g.result = null;
  g.next = null;
  g.final = null;

  const turn = o.turn ?? g.dealer;
  const t = wall.shift()!;
  players[turn].hand.push(t);
  players[turn].drawn = t;
  g.hand.step = { type: 'turn', seat: turn, afterCall: false, rinshan: false };
  return g;
}

// ---------------------------------------------------------------------------
// Scripted play

interface Scripted {
  response: boolean;
  build: (g: GameState) => Action;
}
export type ScriptStep = Action | Scripted;

const RESPONSES = new Set(['ron', 'pon', 'chii', 'daiminkan', 'pass']);

/**
 * Discards a tile of the given kind. 'drawn' = the drawn tile, or after a call the first legal
 * discard. Prefers the drawn copy, then a non-red copy.
 */
export function discard(seat: Seat, tile = 'drawn', riichi = false): Scripted {
  return {
    response: false,
    build: (g) => {
      const p = g.hand.players[seat];
      if (tile === 'drawn') {
        if (p.drawn !== null) return { type: 'discard', seat, tile: p.drawn, riichi };
        const any = legalActions(g, seat).find((a) => a.type === 'discard' && !!a.riichi === riichi);
        if (!any) throw new Error(`Seat ${seat} cannot discard`);
        return any;
      }
      const k = kindOf(parseTiles(tile)[0]);
      const red = tile.startsWith('0');
      const cands = p.hand.filter((t) => kindOf(t) === k && (!red || isRedTile(t, g.rules.redFives)));
      if (!cands.length) throw new Error(`Seat ${seat} has no ${tile}`);
      const pick =
        cands.find((t) => t === p.drawn) ?? cands.find((t) => !isRedTile(t, g.rules.redFives)) ?? cands[0];
      return { type: 'discard', seat, tile: pick, riichi };
    },
  };
}

export const riichi = (seat: Seat, tile = 'drawn') => discard(seat, tile, true);
export const pass = (seat: Seat): Action => ({ type: 'pass', seat });
export const ron = (seat: Seat): Action => ({ type: 'ron', seat });
export const tsumo = (seat: Seat): Action => ({ type: 'tsumo', seat });
export const daiminkan = (seat: Seat): Action => ({ type: 'daiminkan', seat });
export const kyuushu = (seat: Seat): Action => ({ type: 'kyuushu', seat });
export const kan = (seat: Seat, tile: string): Action => ({ type: 'kan', seat, kind: kindOf(parseTiles(tile)[0]) });

/** The first legal pon for `seat`. */
export function pon(seat: Seat): Scripted {
  return { response: true, build: (g) => findCall(g, seat, 'pon') };
}

/** A legal chii for `seat` using hand tiles of the given kinds, e.g. '45m'. */
export function chii(seat: Seat, tiles?: string): Scripted {
  return { response: true, build: (g) => findCall(g, seat, 'chii', tiles) };
}

function findCall(g: GameState, seat: Seat, type: 'pon' | 'chii', tiles?: string): Action {
  const kinds = tiles ? parseTiles(tiles).map(kindOf).sort() : null;
  const a = legalActions(g, seat).find(
    (x) =>
      x.type === type &&
      (!kinds || JSON.stringify(x.tiles.map(kindOf).sort()) === JSON.stringify(kinds)),
  );
  if (!a) throw new Error(`No legal ${type} ${tiles ?? ''} for seat ${seat}`);
  return a;
}

/** Passes every pending call-window response. */
export function settle(state: GameState, events: GameEvent[] = []): GameState {
  let g = state;
  while (g.phase === 'playing' && (g.hand.step.type === 'calls' || g.hand.step.type === 'chankan')) {
    const r = applyAction(g, pass(pendingSeats(g)[0]));
    events.push(...r.events);
    g = r.state;
  }
  return g;
}

/**
 * Plays scripted steps. Before a step that is not a response from a pending seat, open call
 * windows are passed. With `settle` (default), any window left open at the end is passed too.
 */
export function play(
  state: GameState,
  steps: ScriptStep[],
  opts: { settle?: boolean } = {},
): { state: GameState; events: GameEvent[] } {
  let g = state;
  const events: GameEvent[] = [];
  for (const step of steps) {
    const isResponse = 'build' in step ? step.response : RESPONSES.has(step.type);
    const seat = 'build' in step ? null : 'seat' in step ? step.seat : null;
    const pending = pendingSeats(g);
    const answersWindow =
      isResponse && (g.hand.step.type === 'calls' || g.hand.step.type === 'chankan') && (seat === null || pending.includes(seat));
    if (!answersWindow) g = settle(g, events);
    const action = 'build' in step ? step.build(g) : step;
    const r = applyAction(g, action);
    events.push(...r.events);
    g = r.state;
  }
  if (opts.settle ?? true) g = settle(g, events);
  return { state: g, events };
}

export const actionTypes = (g: GameState, seat: Seat) => new Set(legalActions(g, seat).map((a) => a.type));

export function lastResult(g: GameState) {
  if (!g.result) throw new Error('Hand has not ended');
  return g.result;
}
