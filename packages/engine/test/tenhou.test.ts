/// <reference types="node" />
// Tenhou game logs as an end-to-end oracle: every committed game is replayed through the engine with the TENHOU rules
// and must match Tenhou's results exactly (test/tenhou/replay.ts). The fixtures are Houou-table games picked for edge
// cases, with player names and shuffle data stripped. Bulk runs over downloaded logs: scripts/tenhou-replay.ts.
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TENHOU, applyAction, createGame, makeRules } from '../src/index.ts';
import { withWall } from '../src/fixed-wall.ts';
import { type TenhouGame, decodeMeld, parseMjlog } from './tenhou/mjlog.ts';
import { handLabel, replayGame, wallOf } from './tenhou/replay.ts';

const dir = new URL('./tenhou/fixtures/', import.meta.url);
const games: [string, TenhouGame][] = readdirSync(dir)
  .filter((f) => f.endsWith('.xml'))
  .sort()
  .map((f) => [f, parseMjlog(readFileSync(new URL(f, dir), 'utf8'))]);

describe('Tenhou replays', () => {
  it.each(games)('%s', (_, game) => {
    const diffs = replayGame(game).flatMap((h) => h.mismatches.map((m) => `${h.label}: ${m}`));
    expect(diffs).toEqual([]);
  });

  it('the fixtures cover the edge cases they were chosen for', () => {
    const seen = new Set<string>();
    for (const [, game] of games) {
      if (game.hands.some((h) => h.round >= 8)) seen.add('west round');
      for (const h of game.hands) {
        for (const e of h.events) if (e.type === 'call') seen.add(e.meld.type);
        if (h.agari.length === 2) seen.add('double ron');
        if (h.ryuukyoku) seen.add(h.ryuukyoku.reason ?? 'exhaustive');
        if (h.owari?.points.some((p) => p < 0)) seen.add('bankruptcy');
        for (const a of h.agari) {
          if (a.paoWho !== null) seen.add('pao');
          if (a.yakuman.length) seen.add('yakuman');
          for (const [y] of a.yaku) if (y >= 3 && y <= 6) seen.add(['chankan', 'rinshan', 'haitei', 'houtei'][y - 3]);
        }
      }
    }
    const wanted = [
      'chii', 'pon', 'daiminkan', 'shouminkan', 'ankan', 'chankan', 'rinshan', 'haitei', 'houtei', 'double ron',
      'exhaustive', 'yao9', 'kan4', 'nm', 'bankruptcy', 'west round', 'yakuman', 'pao', 'reach4', 'ron3', 'kaze4',
    ];
    expect(wanted.filter((w) => !seen.has(w))).toEqual([]);
  });

  it('the converted actions replay the hand on the explicit wall', () => {
    const [, game] = games[0];
    const replays = replayGame(game);
    const hand = game.hands[1];
    let g = createGame(makeRules(TENHOU, {}), 'x').state;
    g.dealer = hand.dealer;
    g.roundWind = hand.round >> 2;
    g.honba = hand.honba;
    g.riichiSticks = hand.riichiSticks;
    g.scores = [...hand.scores];
    g = withWall(g, replays[1].layout);
    for (const a of replays[1].actions) g = applyAction(g, a).state;
    expect(replays[1].label).toBe(handLabel(hand));
    expect(g.phase).not.toBe('playing');
    expect(g.result?.deltas).toEqual(
      hand.agari.length
        ? hand.agari.reduce((s, a) => s.map((x, i) => x + a.deltas[i]), [0, 0, 0, 0])
        : hand.ryuukyoku!.deltas,
    );
  });
});

describe('mjlog parsing', () => {
  it('decodes calls (examples from real logs)', () => {
    // Seat 2 discarded 51 (4p); seat 3 calls chii with 42 (2p) and 44 (3p).
    expect(decodeMeld(3, 27031)).toEqual({ type: 'chii', tiles: [42, 44, 51], called: 51, from: 2, kind: 10 });
    // Seat 0 discarded 126 (white); seat 1 calls pon.
    expect(decodeMeld(1, 48171)).toEqual({ type: 'pon', tiles: [124, 126, 127], called: 126, from: 0, kind: 31 });
    expect(decodeMeld(0, 2048)).toEqual({ type: 'ankan', tiles: [8, 9, 10, 11], called: null, from: null, kind: 2 });
    expect(decodeMeld(0, 31745)).toMatchObject({ type: 'daiminkan', called: 124, from: 1, kind: 31 });
    expect(decodeMeld(3, 49683)).toEqual({
      type: 'shouminkan',
      tiles: [129, 130, 131, 128],
      called: 128,
      from: 2,
      kind: 32,
    });
  });

  it('reads the wall a hand shows: draws, replacement draws, dora and ura indicators', () => {
    const [, game] = games.find(([, g]) => g.hands.some((h) => h.events.some((e) => e.type === 'dora')))!;
    const hand = game.hands.find((h) => h.events.some((e) => e.type === 'dora'))!;
    const w = wallOf(hand);
    expect(w.rinshan.length).toBeGreaterThan(0);
    expect(w.dora.length).toBeGreaterThan(1);
    expect(w.hands.flat()).toHaveLength(52);
  });
});

describe('withWall', () => {
  const layout = {
    hands: [0, 1, 2, 3].map((s) => Array.from({ length: 13 }, (_, i) => s * 13 + i)),
    draws: [60, 61],
    rinshan: [70],
    dora: [80],
    ura: [90],
  };

  it('deals the given tiles and has the dealer draw first', () => {
    const g = withWall(createGame(TENHOU, 'x').state, layout);
    expect(g.hand.players[0].hand).toEqual([...layout.hands[0], 60]);
    expect(g.hand.wall[0]).toBe(61);
    expect(g.hand.wall).toHaveLength(69);
    expect([g.hand.rinshan[0], g.hand.doraIndicators[0], g.hand.uraIndicators[0]]).toEqual([70, 80, 90]);
    const h = g.hand;
    const all = [...h.wall, ...h.rinshan, ...h.doraIndicators, ...h.uraIndicators, ...h.players.flatMap((p) => p.hand)];
    expect(new Set(all).size).toBe(136);
  });

  it('rejects repeated tiles and states in the middle of a hand', () => {
    expect(() => withWall(createGame(TENHOU, 'x').state, { ...layout, draws: [0] })).toThrow(/repeated/);
    const g = createGame(TENHOU, 'x').state;
    const after = applyAction(g, { type: 'discard', seat: 0, tile: g.hand.players[0].drawn! }).state;
    expect(() => withWall(after, layout)).toThrow(/start of a hand/);
  });
});
