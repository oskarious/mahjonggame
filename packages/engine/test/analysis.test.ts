import { describe, expect, it } from 'vitest';
import {
  type Counts,
  DEFAULT_RULES,
  type Tile,
  analyzeDiscards,
  analyzeHand,
  analyzeSeat,
  countKinds,
  kindOf,
  kindToString,
  parseTiles,
  randomInt,
  seedRng,
  shanten,
  shuffle,
  unseenCounts,
  viewFor,
  waits,
} from '../src/index.ts';
import { discard, play, rig } from './helpers.ts';

/** Unseen counts when only the player's own hand is visible. */
const unseenOf = (tiles: Tile[]): Counts => countKinds(tiles).map((n) => 4 - n);
const analyze = (hand: string) => {
  const tiles = parseTiles(hand);
  return analyzeHand(tiles, [], unseenOf(tiles));
};
const kinds = (list: { kind: number }[]) => list.map((t) => kindToString(t.kind)).join(' ');

describe('analyzeHand (between turns)', () => {
  it('tenpai: shanten 0 with the winning tiles and how many are left', () => {
    const a = analyze('123m456p789s55m23s');
    expect([a.shanten, a.tenpai]).toEqual([0, true]);
    expect(a.waits).toEqual([
      { kind: kindOf(parseTiles('1s')[0]), remaining: 4 },
      { kind: kindOf(parseTiles('4s')[0]), remaining: 4 },
    ]);
    expect(a.ukeire).toEqual([]);
    expect(a.total).toBe(8);
  });

  it('1-shanten: every tile that gets the hand to tenpai', () => {
    const a = analyze('123m456p789s55m2s1z');
    expect([a.shanten, a.tenpai]).toEqual([1, false]);
    expect(kinds(a.ukeire)).toBe('5m 1s 2s 3s 4s 1z');
    expect(a.total).toBe(2 + 4 + 3 + 4 + 4 + 3);
  });

  it('counts further-away hands', () => {
    expect(analyze('123m456p789s1z2z3z4z').shanten).toBe(2);
    expect(analyze('147m258p369s1234z').shanten).toBeGreaterThanOrEqual(3);
  });

  it('seven pairs and thirteen orphans are considered', () => {
    expect(analyze('11m22m33p44p55s66s7z')).toMatchObject({ shanten: 0, tenpai: true });
    expect(analyze('19m19p19s1234567z')).toMatchObject({ shanten: 0, total: 13 * 3 });
  });

  it('a hand waiting only on a fifth copy is noten, i.e. still one tile away (EMA 3.3.8)', () => {
    const a = analyze('123m456m789m9999p');
    expect([a.shanten, a.tenpai]).toEqual([1, false]);
    expect(a.ukeire.length).toBeGreaterThan(0);
  });

  it('tiles with no copies left are not counted', () => {
    const tiles = parseTiles('123m456p789s55m23s');
    const unseen = unseenOf(tiles);
    unseen[kindOf(parseTiles('4s')[0])] = 0;
    const a = analyzeHand(tiles, [], unseen);
    expect(a.waits.map((w) => w.remaining)).toEqual([4, 0]);
    expect(a.total).toBe(4);
  });
});

describe('analyzeDiscards (own turn)', () => {
  it('ranks discards: tenpai first, then by number of useful tiles', () => {
    const tiles = parseTiles('123m456p789s55m23s1z');
    const opts = analyzeDiscards(tiles, [], unseenOf(tiles));
    expect(kindToString(opts[0].kind)).toBe('1z');
    expect(opts[0]).toMatchObject({ shanten: 0, tenpai: true, total: 8, furiten: false });
    expect(opts.every((o, i) => i === 0 || o.shanten >= opts[i - 1].shanten)).toBe(true);
    expect(opts.find((o) => kindToString(o.kind) === '5m')!.shanten).toBe(1);
  });

  it('flags discards that would leave the hand furiten', () => {
    const tiles = parseTiles('123m456p789s55m23s1z');
    const opts = analyzeDiscards(tiles, [], unseenOf(tiles), [kindOf(parseTiles('4s')[0])]);
    expect(opts[0]).toMatchObject({ tenpai: true, furiten: true });
  });
});

describe('analyzeSeat / viewFor', () => {
  it('only counts tiles the player can see', () => {
    const g = rig({ hands: [undefined, '123m456p789s55m23s'], discards: ['4s4s'], dora: '1s' });
    const u = unseenCounts(g, 1);
    expect(u[kindOf(parseTiles('4s')[0])]).toBe(2); // two in seat 0's discards
    expect(u[kindOf(parseTiles('1s')[0])]).toBe(3); // dora indicator
    const a = analyzeSeat(g, 1);
    expect(a.waits.map((w) => w.remaining)).toEqual([3, 2]);
    expect(a.furiten).toBe(false);
  });

  it('between turns: current hand; on turn: per-discard options and whether the hand is complete', () => {
    const g = rig({ hands: [undefined, '123m456p789s55m23s'], draws: '? 1z' });
    const between = analyzeSeat(g, 1);
    expect([between.discards, between.tenpai]).toEqual([null, true]);

    const turn = play(g, [discard(0)]).state;
    const a = analyzeSeat(turn, 1);
    expect(a.discards!.length).toBeGreaterThan(1);
    expect(a).toMatchObject({ shanten: 0, tenpai: true, complete: false });
    expect(kindToString(a.discards![0].kind)).toBe('1z');

    const win = rig({ hands: ['123m456p789s55m23s'], draws: '4s' });
    expect(analyzeSeat(win, 0).complete).toBe(true);
  });

  it('shows furiten between turns', () => {
    const g = rig({ hands: [undefined, '123m456p789s55m23s'], discards: [undefined, '1s'] });
    expect(analyzeSeat(g, 1).furiten).toBe(true);
  });

});

describe('hint levels in the player view', () => {
  const tenpai = rig({ hands: [undefined, '123m456p789s55m23s'] });

  it('off by default: nothing about the hand is sent', () => {
    expect(viewFor(tenpai, 1).hints).toBeNull();
    expect(viewFor(tenpai, 1, { hints: 'off' }).hints).toBeNull();
  });

  it('distance: only how many tiles away from winning', () => {
    const far = rig({ hands: [undefined, '147m258p369s1234z'] });
    const h = viewFor(far, 1, { hints: 'distance' }).hints!;
    expect(h.tilesAway).toBe(h.shanten + 1);
    expect(h.tilesAway).toBeGreaterThanOrEqual(5);
    expect(Object.keys(h).sort()).toEqual(['complete', 'level', 'shanten', 'tenpai', 'tilesAway']);

    expect(viewFor(tenpai, 1, { hints: 'distance' }).hints).toMatchObject({ tilesAway: 1, shanten: 0, tenpai: true });
    const complete = rig({ hands: ['123m456p789s55m23s'], draws: '4s' });
    expect(viewFor(complete, 0, { hints: 'distance' }).hints).toMatchObject({ tilesAway: 0, shanten: -1, complete: true });
  });

  it('full: improving tiles and ranked discards', () => {
    const onTurn = rig({ hands: ['123m456p789s55m23s'], draws: '1z' });
    const h = viewFor(onTurn, 0, { hints: 'full' }).hints!;
    expect(kindToString(h.discards![0].kind)).toBe('1z');
    expect(h.waits!.length).toBe(2);
  });
});

describe('tenpai waits in the player view (any hint level)', () => {
  const opts = (g: ReturnType<typeof rig>, seat = 0) =>
    Object.fromEntries(viewFor(g, seat).tenpai.map((o) => [o.kind === null ? '-' : kindToString(o.kind), kinds(o.waits)]));

  it('on turn: the waits after each discard that leaves the hand tenpai, even with hints off', () => {
    const g = rig({ hands: ['123m456p789s55m23s'], draws: '5m' });
    expect(viewFor(g, 0).hints).toBeNull();
    expect(opts(g)).toEqual({ '5m': '1s 4s', '2s': '3s', '3s': '2s' });
    const fiveM = viewFor(g, 0).tenpai.find((o) => o.kind !== null && kindToString(o.kind) === '5m')!;
    expect(fiveM.waits.map((w) => w.remaining)).toEqual([4, 4]);
    expect(viewFor(g, 0).tenpai.every((o) => !o.furiten)).toBe(true);
  });

  it('on turn: a discard that leaves a discarded wait is furiten', () => {
    const g = rig({ hands: ['123m456p789s55m23s'], discards: ['1s'], draws: '1z' });
    const [o] = viewFor(g, 0).tenpai;
    expect([kindToString(o.kind!), o.furiten]).toEqual(['1z', true]);
  });

  it('also when riichi is not legal (open hand, no points, last tile)', () => {
    const open = rig({ hands: ['456p789s55m23s'], melds: [[['chii', '123m']]], draws: '5m' });
    expect(opts(open)).toEqual({ '5m': '1s 4s', '2s': '3s', '3s': '2s' });
    const broke = rig({ hands: ['123m456p789s55m23s'], draws: '5m', scores: [500, 25000, 25000, 49500] });
    expect(Object.keys(opts(broke))).toHaveLength(3);
    const lastTile = rig({ hands: ['123m456p789s55m23s'], draws: '5m', wallSize: 1 });
    expect(Object.keys(opts(lastTile))).toHaveLength(3);
  });

  it('between turns: the current waits and furiten, or nothing when noten', () => {
    expect(opts(rig({ hands: [undefined, '123m456p789s55m23s'] }), 1)).toEqual({ '-': '1s 4s' });
    const furiten = rig({ hands: [undefined, '123m456p789s55m23s'], discards: [undefined, '1s'] });
    expect(viewFor(furiten, 1).tenpai[0].furiten).toBe(true);
    expect(viewFor(rig({ hands: [undefined, '147m258p369s1234z'] }), 1).tenpai).toEqual([]);
    // Waiting only on a fifth copy is noten.
    expect(viewFor(rig({ hands: [undefined, '123m456m789m9999p'] }), 1).tenpai).toEqual([]);
  });

  it('matches analyzeSeat and covers every legal riichi discard (random hands)', () => {
    const rng = seedRng('riichi-options');
    let withRiichi = 0;
    for (let i = 0; i < 200; i++) {
      // One suit per hand, so tenpai (and riichi) is common.
      const suit = 36 * randomInt(rng, 3);
      const tiles = shuffle(rng, Array.from({ length: 36 }, (_, j) => j + suit)).slice(0, 14);
      const str = (ts: Tile[]) => ts.map((t) => kindToString(kindOf(t))).join('');
      const g = rig({ hands: [str(tiles.slice(0, 13))], draws: str(tiles.slice(13)) });
      const v = viewFor(g, 0);
      const expected = analyzeSeat(g, 0)
        .discards!.filter((o) => o.tenpai)
        .map(({ kind, waits, furiten }) => ({ kind, waits, furiten }));
      const byKind = (a: { kind: number | null }, b: { kind: number | null }) => a.kind! - b.kind!;
      expect([...v.tenpai].sort(byKind)).toEqual(expected.sort(byKind));
      const legal = v.actions.flatMap((a) => (a.type === 'discard' && a.riichi ? [kindOf(a.tile)] : []));
      for (const k of legal) expect(v.tenpai.some((o) => o.kind === k)).toBe(true);
      if (legal.length) withRiichi++;
    }
    expect(withRiichi).toBeGreaterThan(0);
  });
});

describe('consistency with the rules (random hands)', () => {
  const rng = seedRng('analysis');
  const deal = (n: number) => shuffle(rng, Array.from({ length: 136 }, (_, i) => i)).slice(0, n);

  it('13 tiles: tenpai matches waits(), ukeire tiles really reduce shanten', () => {
    for (let i = 0; i < 300; i++) {
      // Bias towards near-complete hands by drawing from a narrow set of kinds half the time.
      const tiles = i % 2 ? deal(13) : shuffle(rng, Array.from({ length: 36 }, (_, j) => j)).slice(0, 13);
      const unseen = unseenOf(tiles);
      const a = analyzeHand(tiles, [], unseen);
      expect(a.tenpai).toBe(waits(tiles, []).length > 0);
      expect(a.shanten === 0).toBe(a.tenpai);
      const c = countKinds(tiles);
      expect(a.shanten).toBeGreaterThanOrEqual(shanten(c, 0));
      for (const u of a.ukeire) {
        c[u.kind]++;
        if (a.shanten > 1) expect(shanten(c, 0)).toBeLessThan(a.shanten);
        c[u.kind]--;
      }
    }
  });

  it('14 tiles: the best discard matches the 14-tile shanten', () => {
    for (let i = 0; i < 200; i++) {
      const tiles = i % 2 ? deal(14) : shuffle(rng, Array.from({ length: 36 }, (_, j) => j)).slice(0, 14);
      const raw = shanten(countKinds(tiles), 0);
      const best = analyzeDiscards(tiles, [], unseenOf(tiles))[0];
      if (raw >= 1) expect(best.shanten).toBe(raw);
      else expect(best.shanten).toBeLessThanOrEqual(1);
    }
  });

  it('is fast enough to compute on every action', () => {
    const tiles = parseTiles('13579m2468p13579s');
    const start = Date.now();
    for (let i = 0; i < 50; i++) analyzeDiscards(tiles, [], unseenOf(tiles));
    const perCall = (Date.now() - start) / 50;
    expect(perCall).toBeLessThan(20);
    void DEFAULT_RULES;
    void randomInt;
  });
});
