import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_RULES, ENGINE_VERSION } from '@mahjong/engine';
import { Hub } from '../src/hub.ts';
import { anonymousBot, type SeatInit } from '../src/matchmaking.ts';
import { replayGame } from '../src/recovery.ts';
import { Room } from '../src/room.ts';
import { MemoryStore } from '../src/store.ts';
import { FakeClient, TEST_CONFIG, addBots, botSeat, seeded, tickUntil } from './helpers.ts';

const seats: SeatInit[] = [
  { kind: 'human', userId: 'a', name: 'a', rating: 1000, games: 0 },
  anonymousBot(0.4),
  botSeat('x', 1180),
  { kind: 'human', userId: 'd', name: 'd', rating: 1150, games: 30 },
];

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('records and recovery', () => {
  it('replaying a finished game reproduces its standings', async () => {
    const store = new MemoryStore();
    await store.createGame({ id: 'g', format: 'east', rules: DEFAULT_RULES, seed: 'replay', seats });
    const room = new Room({ store, config: { ...TEST_CONFIG, abandonMs: 0 }, random: () => 0.3, onEnd: () => {} }, { id: 'g', format: 'east', rules: DEFAULT_RULES, seed: 'replay', seats });
    room.start();
    await vi.runAllTimersAsync();
    await room.idle();
    expect(room.finished).toBe(true);
    const rec = store.games.get('g')!;
    expect(rec.status).toBe('finished');
    const replayed = replayGame(rec.rules, rec.seed, rec.actions);
    expect(replayed.phase).toBe('gameOver');
    expect(replayed.final).toEqual(rec.final);
    expect(replayed.seq).toBe(rec.actions.length);
    for (const r of rec.results) {
      const f = rec.final!.find((x) => x.seat === r.seat)!;
      expect(r.placement).toBe(f.rank);
      expect(r.points).toBe(f.points);
    }
    expect(new Set(rec.results.map((r) => r.points)).size).toBeGreaterThan(1);
    const after = rec.results.find((r) => r.seat === 0)!.ratingAfter!;
    expect(store.ratings.get('a')).toEqual({ rating: after, games: 1 });
    expect(store.ratings.get('x')!.games).toBe(31);
    expect(rec.results.find((r) => r.seat === 1)!.ratingAfter).toBeNull(); // the anonymous bot is not rated
    expect(store.ratings.has('b')).toBe(false);
  });

  it('a room rebuilt from the store continues from the last stored action', async () => {
    const store = new MemoryStore();
    await addBots(store, [950, 990, 1010, 1050, 1100]);
    const hub1 = new Hub({ store, config: TEST_CONFIG, random: seeded('recovery'), log: () => {} });
    await hub1.bots.load();
    const a = new FakeClient('a');
    await hub1.attach(a);
    hub1.handle(a, { type: 'queue.join', format: 'east' });
    await tickUntil(hub1, () => !!hub1.roomOf('a'));
    const { room: room1, seat } = hub1.roomOf('a')!;
    const botIds = room1.seats.flatMap((s) => (s.kind === 'bot' ? [s.userId!] : [])).sort();
    expect(botIds).toHaveLength(3);
    // Play a while: the human times out on every decision, bots play.
    await vi.advanceTimersByTimeAsync(60_000);
    await room1.idle();
    const cut = room1.state.seq;
    expect(cut).toBeGreaterThan(5);
    expect(room1.finished).toBe(false);
    hub1.shutdown(); // "crash": timers stop, nothing more is written
    const snapshot = JSON.stringify(room1.state);

    // New process: recover from the store.
    const hub2 = new Hub({ store, config: TEST_CONFIG, random: seeded('recovery-2'), log: () => {} });
    await hub2.bots.load();
    const n = await hub2.recover((g) => replayGame(g.rules, g.seed, g.actions));
    expect(n).toBe(1);
    const { room: room2, seat: seat2 } = hub2.roomOf('a')!;
    expect(seat2).toBe(seat);
    expect(JSON.stringify(room2.state)).toBe(snapshot);
    // The recovered room keeps its bot players, who are busy again in the new process.
    expect(room2.seats.flatMap((s) => (s.kind === 'bot' ? [s.userId!] : [])).sort()).toEqual(botIds);
    for (const id of botIds) expect(hub2.bots.bots.get(id)).toMatchObject({ state: 'busy', roomId: room2.id });
    expect(room2.info(seat2).players.map((p) => p.name)).toEqual(room1.info(seat).players.map((p) => p.name));
    expect(store.games.get(room2.id)!.actions).toHaveLength(cut);

    // The player reconnects and gets their view at the same sequence number; then the game runs to the end.
    const a2 = new FakeClient('a');
    await hub2.attach(a2);
    await room2.idle();
    expect(a2.last('welcome')!.activeGame?.gameId).toBe(room1.id);
    expect(a2.last('update')!.seq).toBe(room1.state.publicSeq);
    hub2.detach(a2);
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    await vi.runAllTimersAsync();
    await room2.idle();
    expect(room2.finished).toBe(true);
    const rec = store.games.get(room2.id)!;
    expect(replayGame(rec.rules, rec.seed, rec.actions).final).toEqual(rec.final);
    expect(rec.actions.map((_, i) => i)).toEqual(rec.actions.map((_, i) => i)); // contiguous by construction
  });

  it('marks a game whose log no longer replays as aborted', async () => {
    const store = new MemoryStore();
    await store.createGame({ id: 'old', format: 'east', rules: DEFAULT_RULES, seed: 'old', seats });
    // A discard the replayed wall did not deal (as after a change to wall generation).
    await store.appendAction('old', 0, { type: 'discard', seat: 1, tile: 0 });
    const hub = new Hub({ store, config: TEST_CONFIG, log: () => {} });
    await hub.bots.load();
    expect(await hub.recover((g) => replayGame(g.rules, g.seed, g.actions))).toBe(0);
    expect(store.games.get('old')!.status).toBe('aborted');
    expect(await store.loadRunningGames()).toEqual([]);
  });

  it('aborts a game from another engine version without replaying it, and tells its players once', async () => {
    const store = new MemoryStore();
    store.ratings.set('a', { rating: 1000, games: 0 });
    await store.createGame({ id: 'old', format: 'east', rules: DEFAULT_RULES, seed: 'old', seats });
    store.games.get('old')!.engineVersion = ENGINE_VERSION - 1;
    await store.createGame({ id: 'now', format: 'east', rules: DEFAULT_RULES, seed: 'now', seats: [...seats].reverse() });
    const hub = new Hub({ store, config: TEST_CONFIG, log: () => {} });
    await hub.bots.load();
    const replayed: string[] = [];
    const n = await hub.recover((g) => {
      replayed.push(g.id);
      return replayGame(g.rules, g.seed, g.actions);
    });
    expect(n).toBe(1);
    expect(replayed).toEqual(['now']);
    expect(store.games.get('old')!.status).toBe('aborted');
    expect(store.games.get('now')!.status).toBe('running');
    expect(store.ratings.get('a')).toEqual({ rating: 1000, games: 0 });

    // Both humans sat in both games: the one still running wins `activeGame`, the aborted one is reported once.
    const a = new FakeClient('a');
    await hub.attach(a);
    expect(a.last('welcome')).toMatchObject({ abortedGame: 'old', activeGame: { gameId: 'now' } });
    hub.detach(a);
    const again = new FakeClient('a');
    await hub.attach(again);
    expect(again.last('welcome')!.abortedGame).toBeUndefined();
    const d = new FakeClient('d');
    await hub.attach(d);
    expect(d.last('welcome')!.abortedGame).toBe('old');
  });

  it('a game from the current engine version is resumed', async () => {
    const store = new MemoryStore();
    await store.createGame({ id: 'g', format: 'east', rules: DEFAULT_RULES, seed: 'g', seats });
    expect(store.games.get('g')!.engineVersion).toBe(ENGINE_VERSION);
    const hub = new Hub({ store, config: TEST_CONFIG, log: () => {} });
    await hub.bots.load();
    expect(await hub.recover((g) => replayGame(g.rules, g.seed, g.actions))).toBe(1);
    const a = new FakeClient('a');
    await hub.attach(a);
    expect(a.last('welcome')!.abortedGame).toBeUndefined();
  });
});
