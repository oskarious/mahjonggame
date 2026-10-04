// Online play is only fair if nothing a seat is shown or does depends on what that seat cannot see. These tests pin
// that down for every view, hint level and bot decision, so a future change that peeks at hidden state fails here.
import { describe, expect, it } from 'vitest';
import {
  type Action,
  DEFAULT_RULES,
  EMA_2025,
  type GameEvent,
  type GameState,
  type HintLevel,
  type PlayerView,
  type RuleSet,
  type Seat,
  applyAction,
  botAction,
  createGame,
  pendingSeats,
  randomInt,
  redactEvent,
  scrambleHidden,
  seedRng,
  timeoutAction,
  viewFor,
} from '../src/index.ts';
import { chacha20Block, nextUint32, sha256, utf8 } from '../src/rng.ts';
import { scenario } from './helpers.ts';

const LEVELS: HintLevel[] = ['off', 'distance', 'full'];
const hex = (words: number[]) => words.map((w) => w.toString(16).padStart(8, '0')).join('');

function seededRandom(seed: string): () => number {
  const rng = seedRng(seed);
  return () => randomInt(rng, 1_000_000) / 1_000_000;
}

interface Step {
  before: GameState;
  after: GameState;
  events: GameEvent[];
}

/** Plays a bot game and returns every transition. */
function botGame(rules: RuleSet, seed: string): Step[] {
  const random = seededRandom(`bots-${seed}`);
  const steps: Step[] = [];
  let g = createGame(rules, seed).state;
  while (g.phase !== 'gameOver') {
    const action: Action =
      g.phase === 'handOver' ? { type: 'nextHand' } : botAction(g, pendingSeats(g)[0], { skill: 0.7, random })!;
    const t = applyAction(g, action);
    steps.push({ before: g, after: t.state, events: t.events });
    g = t.state;
  }
  return steps;
}

const GAMES: [RuleSet, string][] = [
  [DEFAULT_RULES, 'fair-1'],
  [DEFAULT_RULES, 'fair-2'],
  [EMA_2025, 'fair-3'],
];

describe('wall RNG', () => {
  it('matches the SHA-256 and ChaCha20 test vectors', () => {
    expect(hex(sha256(utf8('')))).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(hex(sha256(utf8('abc')))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    const long = utf8('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq');
    expect(hex(sha256(long))).toBe('248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1');
    // RFC 8439 2.3.2: key 00..1f, counter 1, nonce 00000009 0000004a 00000000 (words are little-endian).
    const key = Array.from({ length: 8 }, (_, i) => {
      const b = i * 4;
      return (b | ((b + 1) << 8) | ((b + 2) << 16) | ((b + 3) << 24)) >>> 0;
    });
    const out = chacha20Block(key, 1, [0x09000000, 0x4a000000, 0]);
    expect(out.slice(0, 4)).toEqual([0xe4e7f110, 0x15593bd1, 0x1fdd0f50, 0xc47120a3]);
    expect(out[15]).toBe(0x4e3c50a2);
  });

  it('is deterministic per seed and spreads values evenly', () => {
    const a = seedRng('same');
    const b = seedRng('same');
    const c = seedRng('other');
    const xs = Array.from({ length: 40 }, () => nextUint32(a));
    expect(Array.from({ length: 40 }, () => nextUint32(b))).toEqual(xs);
    expect(Array.from({ length: 40 }, () => nextUint32(c))).not.toEqual(xs);
    const r = seedRng('spread');
    const buckets = new Array(8).fill(0);
    for (let i = 0; i < 80_000; i++) buckets[randomInt(r, 8)]++;
    for (const n of buckets) expect(Math.abs(n - 10_000)).toBeLessThan(500);
  });
});

describe('public sequence number', () => {
  it('does not move for a call response that leaves the window open', () => {
    // Seat 0 discards 5m: seat 1 can chii (46m), seat 2 can pon (55m).
    let g = scenario({ hands: [undefined, '46m', '55m'], draws: '5m' });
    g = applyAction(g, { type: 'discard', seat: 0, tile: g.hand.players[0].drawn! }).state;
    expect(pendingSeats(g)).toEqual([1, 2]);
    const pass2 = applyAction(g, { type: 'pass', seat: 2 });
    expect(pass2.events).toEqual([]);
    expect(pass2.state.seq).toBe(g.seq + 1);
    expect(pass2.state.publicSeq).toBe(g.publicSeq);
    // Nobody else's view changes, so they are not told anything.
    for (const s of [0, 1, 3] as Seat[]) {
      for (const hints of LEVELS) expect(viewFor(pass2.state, s, { hints })).toEqual(viewFor(g, s, { hints }));
    }
    const pass1 = applyAction(pass2.state, { type: 'pass', seat: 1 });
    expect(pass1.events.length).toBeGreaterThan(0);
    expect(pass1.state.publicSeq).toBe(g.publicSeq + 1);
  });

  it('is what the view carries', () => {
    const g = createGame(DEFAULT_RULES, 'seq').state;
    g.seq = 7;
    g.publicSeq = 5;
    expect(viewFor(g, 0).seq).toBe(5);
  });
});

describe('hidden information', () => {
  const games = GAMES.map(([rules, seed]) => botGame(rules, seed));

  it('views at every hint level do not depend on what the seat cannot see', () => {
    const random = seededRandom('scramble-views');
    let checked = 0;
    for (const steps of games) {
      for (const [i, { after: g }] of steps.entries()) {
        if (i % 3) continue;
        for (let seat = 0; seat < 4; seat++) {
          const scrambled = scrambleHidden(g, seat, random);
          for (const hints of LEVELS) {
            expect(viewFor(scrambled, seat, { hints })).toEqual(viewFor(g, seat, { hints }));
          }
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(500);
  });

  it('bot decisions and timeouts do not depend on what the seat cannot see', () => {
    const random = seededRandom('scramble-bots');
    let checked = 0;
    for (const steps of games) {
      for (const [i, { before: g }] of steps.entries()) {
        if (i % 4 || g.phase !== 'playing') continue;
        for (const seat of pendingSeats(g)) {
          const scrambled = scrambleHidden(g, seat, random);
          for (const skill of [0, 0.5, 1]) {
            const a = botAction(g, seat, { skill, random: seededRandom(`${i}-${skill}`) });
            const b = botAction(scrambled, seat, { skill, random: seededRandom(`${i}-${skill}`) });
            expect(b).toEqual(a);
          }
          expect(timeoutAction(scrambled, seat)).toEqual(timeoutAction(g, seat));
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(200);
  });

  it('redacted events only carry tiles the seat can see afterwards', () => {
    const TILE_KEYS = new Set(['tile', 'tiles', 'hands', 'doraIndicator', 'indicator', 'called', 'added']);
    const collect = (v: unknown, out: number[], inTileKey = false): void => {
      if (typeof v === 'number') {
        if (inTileKey) out.push(v);
      } else if (Array.isArray(v)) {
        for (const x of v) collect(x, out, inTileKey);
      } else if (v && typeof v === 'object') {
        for (const [k, x] of Object.entries(v)) collect(x, out, inTileKey || TILE_KEYS.has(k));
      }
    };
    const visible = (v: PlayerView) =>
      new Set([
        ...v.hand,
        ...v.doraIndicators,
        ...v.players.flatMap((p) => [...p.discards.map((d) => d.tile), ...p.melds.flatMap((m) => m.tiles)]),
        ...(v.claimable ? [v.claimable.tile] : []),
      ]);
    for (const steps of games) {
      for (const { after, events } of steps) {
        for (let seat = 0; seat < 4; seat++) {
          const seen = visible(viewFor(after, seat));
          for (const e of events) {
            // Hand and game results are public by the rules (winning and tenpai hands are shown).
            if (e.type === 'handEnd' || e.type === 'gameEnd') continue;
            const tiles: number[] = [];
            collect(redactEvent(e, seat), tiles);
            for (const t of tiles) expect(seen.has(t), `${e.type} shows tile ${t} to seat ${seat}`).toBe(true);
          }
        }
      }
    }
  });
});
