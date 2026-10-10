import { describe, expect, it } from 'vitest';
import {
  type Action,
  DEFAULT_RULES,
  EMA_2025,
  type GameEvent,
  type GameState,
  type RuleSet,
  applyAction,
  botAction,
  createGame,
  legalActions,
  pendingSeats,
  randomInt,
  redactEvent,
  seedRng,
  viewFor,
} from '../src/index.ts';

function checkInvariants(g: GameState): void {
  const total = g.scores.reduce((a, b) => a + b, 0) + g.riichiSticks * g.rules.riichiDeposit;
  expect(total).toBe(4 * g.rules.startingPoints);
  if (g.phase !== 'playing') return;

  const h = g.hand;
  const tiles = [
    ...h.wall,
    ...h.rinshan,
    ...h.doraIndicators,
    ...h.uraIndicators,
    ...h.deadExtra,
    ...h.players.flatMap((p) => [
      ...p.hand,
      ...p.melds.flatMap((m) => m.tiles),
      ...p.discards.filter((d) => d.calledBy === null).map((d) => d.tile),
    ]),
  ].sort((a, b) => a - b);
  expect(tiles).toEqual(Array.from({ length: 136 }, (_, i) => i));

  const step = h.step;
  h.players.forEach((p, s) => {
    const size = p.hand.length + 3 * p.melds.length;
    const active = step.type === 'turn' && step.seat === s;
    expect(size).toBe(active ? 14 : 13);
  });
}

/** Plays a whole game, choosing actions with `pick`. Returns the final state. */
function playGame(rules: RuleSet, seed: string, pick: (g: GameState, seat: number) => Action): GameState {
  let { state } = createGame(rules, seed);
  for (let steps = 0; steps < 20000; steps++) {
    checkInvariants(state);
    if (state.phase === 'gameOver') return state;
    if (state.phase === 'handOver') {
      state = applyAction(state, { type: 'nextHand' }).state;
      continue;
    }
    const seats = pendingSeats(state);
    expect(seats.length).toBeGreaterThan(0);
    for (const seat of seats) {
      // Every legal action must survive a round trip through the view (what the client sees).
      expect(viewFor(state, seat).actions).toEqual(legalActions(state, seat));
      state = applyAction(state, pick(state, seat)).state;
      if (state.phase !== 'playing') break;
    }
  }
  throw new Error('Game did not finish');
}

/** Seeded randomness so bot decisions (noise, blunders) are reproducible. */
function seededRandom(seed: string) {
  const rng = seedRng(seed);
  return () => randomInt(rng, 1_000_000) / 1_000_000;
}

describe('full game simulation', () => {
  for (const [name, rules] of [
    ['default (east-only)', DEFAULT_RULES],
    ['EMA (east+south)', EMA_2025],
  ] as const) {
    it(`bots finish games under ${name} rules`, () => {
      for (let i = 0; i < 4; i++) {
        const random = seededRandom(`bots-${name}-${i}`);
        const g = playGame(rules, `bots-${name}-${i}`, (s, seat) => botAction(s, seat, { random })!);
        expect(g.final).toHaveLength(4);
        const umaSum = g.final!.reduce((a, f) => a + f.uma, 0);
        expect(umaSum).toBe(0);
      }
    });

    it(`random legal play never breaks invariants under ${name} rules`, () => {
      for (let i = 0; i < 6; i++) {
        const rng = seedRng(`random-${name}-${i}`);
        playGame(rules, `random-${name}-${i}`, (s, seat) => {
          const legal = legalActions(s, seat);
          // Favour calls and quads so rarer paths get exercised.
          const special = legal.filter((a) => a.type !== 'discard' && a.type !== 'pass');
          if (special.length && randomInt(rng, 3) === 0) return special[randomInt(rng, special.length)];
          return legal[randomInt(rng, legal.length)];
        });
      }
    });
  }

  it('bots of every skill level finish games', () => {
    const rng = seedRng('easy');
    const random = () => randomInt(rng, 1000) / 1000;
    const g = playGame(DEFAULT_RULES, 'easy-bots', (s, seat) =>
      botAction(s, seat, { skill: [0, 0.3, 0.7, 1][seat], random })!,
    );
    expect(g.phase).toBe('gameOver');
  });

  it('is deterministic for the same seed and actions', () => {
    const ra = seededRandom('same');
    const rb = seededRandom('same');
    const a = playGame(DEFAULT_RULES, 'same-seed', (s, seat) => botAction(s, seat, { random: ra })!);
    const b = playGame(DEFAULT_RULES, 'same-seed', (s, seat) => botAction(s, seat, { random: rb })!);
    expect(a.final).toEqual(b.final);
  });

  it('rejects illegal actions', () => {
    const { state } = createGame(DEFAULT_RULES, 'illegal');
    const notDealer = 1;
    expect(() =>
      applyAction(state, { type: 'discard', seat: notDealer, tile: state.hand.players[1].hand[0] }),
    ).toThrow();
    expect(() => applyAction(state, { type: 'discard', seat: 0, tile: state.hand.players[1].hand[0] })).toThrow();
    expect(() => applyAction(state, { type: 'nextHand' })).toThrow();
  });

  it('never shows other players their opponents’ tiles', () => {
    const { events } = createGame(DEFAULT_RULES, 'redact');
    const forSeat2 = events.map((e) => redactEvent(e, 2));
    const start = forSeat2.find((e): e is Extract<GameEvent, { type: 'handStart' }> => e.type === 'handStart')!;
    expect(start.hands[2]).toHaveLength(13);
    expect(start.hands[0]).toEqual([]);
    const draw = forSeat2.find((e) => e.type === 'draw') as Extract<GameEvent, { type: 'draw' }>;
    expect(draw.tile).toBeNull();
  });
});
