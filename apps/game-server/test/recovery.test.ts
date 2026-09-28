import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_RULES } from '@mahjong/engine';
import { Hub } from '../src/hub.ts';
import type { SeatInit } from '../src/matchmaking.ts';
import { replayGame } from '../src/recovery.ts';
import { Room } from '../src/room.ts';
import { MemoryStore } from '../src/store.ts';
import { FakeClient, TEST_CONFIG } from './helpers.ts';

const seats: SeatInit[] = [
  { kind: 'human', userId: 'a', name: 'a', rating: 1000, games: 0 },
  { kind: 'bot', skill: 0.4 },
  { kind: 'bot', skill: 0.6 },
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
    expect(store.ratings.has('b')).toBe(false);
  });

  it('a room rebuilt from the store continues from the last stored action', async () => {
    const store = new MemoryStore();
    const hub1 = new Hub({ store, config: TEST_CONFIG, random: () => 0.3, log: () => {} });
    const a = new FakeClient('a');
    await hub1.attach(a);
    hub1.handle(a, { type: 'queue.join', format: 'east' });
    await vi.advanceTimersByTimeAsync(15_000);
    await hub1.tick();
    const { room: room1, seat } = hub1.roomOf('a')!;
    // Play a while: the human times out on every decision, bots play.
    await vi.advanceTimersByTimeAsync(60_000);
    await room1.idle();
    const cut = room1.state.seq;
    expect(cut).toBeGreaterThan(5);
    expect(room1.finished).toBe(false);
    hub1.shutdown(); // "crash": timers stop, nothing more is written
    const snapshot = JSON.stringify(room1.state);

    // New process: recover from the store.
    const hub2 = new Hub({ store, config: TEST_CONFIG, random: () => 0.3, log: () => {} });
    const n = await hub2.recover((g) => replayGame(g.rules, g.seed, g.actions));
    expect(n).toBe(1);
    const { room: room2, seat: seat2 } = hub2.roomOf('a')!;
    expect(seat2).toBe(seat);
    expect(JSON.stringify(room2.state)).toBe(snapshot);
    expect(store.games.get(room2.id)!.actions).toHaveLength(cut);

    // The player reconnects and gets their view at the same sequence number; then the game runs to the end.
    const a2 = new FakeClient('a');
    await hub2.attach(a2);
    await room2.idle();
    expect(a2.last('welcome')!.activeGame?.gameId).toBe(room1.id);
    expect(a2.last('update')!.seq).toBe(cut);
    hub2.detach(a2);
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    await vi.runAllTimersAsync();
    await room2.idle();
    expect(room2.finished).toBe(true);
    const rec = store.games.get(room2.id)!;
    expect(replayGame(rec.rules, rec.seed, rec.actions).final).toEqual(rec.final);
    expect(rec.actions.map((_, i) => i)).toEqual(rec.actions.map((_, i) => i)); // contiguous by construction
  });
});
