import { type Tile, kindOf, parseTiles } from './tiles.ts';
import { type RuleSet, DEFAULT_RULES } from './rules.ts';
import type { Meld, MeldType, Seat } from './types.ts';
import { type GameState, type PlayerState, createGame } from './game.ts';

/** A meld from its tiles (the called tile first), called from `from`. */
export function makeMeld(type: MeldType, tiles: Tile[], from: Seat): Meld {
  if (type === 'ankan') return { type, tiles, called: null, from: null };
  return { type, tiles, called: tiles[0], from, ...(type === 'shouminkan' ? { added: tiles[3] } : {}) };
}

/** A position described in tile notation ("123m406p11z"; see `parseTiles`). */
export interface ScenarioOptions {
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

/**
 * Builds a playing state from a description, with `turn` having just drawn. Pure and deterministic.
 * Throws on impossible positions: too many concealed tiles for a seat, a fifth copy, or more tiles than exist.
 */
export function scenario(o: ScenarioOptions): GameState {
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
  if (!wall.length) throw new Error('Out of tiles');
  const deadExtra: Tile[] = [];
  if (o.wallSize !== undefined) deadExtra.push(...wall.splice(o.wallSize));

  const kans: Seat[] = [];
  melds.forEach((ms, s) => ms.forEach((m) => m.tiles.length === 4 && kans.push(s)));
  deadExtra.push(...rinshan.splice(0, kans.length));

  const g = createGame(rules, 'scenario').state;
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
    pendingDora: 0,
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
