import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Hub } from '../src/hub.ts';
import { MemoryStore } from '../src/store.ts';
import { FakeClient, TEST_CONFIG, addBots, seeded, tickUntil } from './helpers.ts';

let store: MemoryStore;
let hub: Hub;

beforeEach(async () => {
  vi.useFakeTimers();
  store = new MemoryStore();
  await addBots(store, [940, 980, 1000, 1010, 1040, 1080, 1120, 1300]);
  hub = new Hub({ store, config: TEST_CONFIG, random: seeded('hub'), log: (m, e) => console.error(m, e) });
  await hub.bots.load();
});

/** Queue `c` and tick until bot players have joined and the game started. */
async function startSolo(c: FakeClient, format: 'east' | 'south' = 'east') {
  hub.handle(c, { type: 'queue.join', format });
  await tickUntil(hub, () => !!hub.roomOf(c.user.id));
  return hub.roomOf(c.user.id)!;
}
afterEach(() => vi.useRealTimers());

describe('Hub', () => {
  it('queues a player, starts a game with bot players who look like humans, and resumes it on reconnect', async () => {
    const a = new FakeClient('a');
    await hub.attach(a);
    expect(a.last('welcome')).toMatchObject({ activeGame: null, queued: null });
    hub.handle(a, { type: 'queue.join', format: 'east' });
    expect(a.last('queue.status')).toEqual({ type: 'queue.status', format: 'east', waitedMs: 0 });
    await vi.advanceTimersByTimeAsync(1_000);
    await hub.tick();
    expect(a.last('queue.status')!.waitedMs).toBe(1_000);
    await tickUntil(hub, () => !!a.last('game.start'));
    const start = a.last('game.start')!;
    expect(start.game.players[start.game.seat]).toEqual({ seat: start.game.seat, name: 'a', rating: 1000 });
    const names = new Map([...hub.bots.bots.values()].map((b) => [b.name, b]));
    const others = start.game.players.filter((p) => p.seat !== start.game.seat);
    for (const p of others) {
      expect(Object.keys(p).sort()).toEqual(['name', 'rating', 'seat']);
      expect(names.get(p.name)!.rating).toBe(p.rating);
      expect(names.get(p.name)!.state).toBe('busy');
    }
    const room = hub.roomOf('a')!.room;
    await room.idle();
    expect(a.last('update')!.gameId).toBe(start.game.gameId);
    expect(store.games.get(start.game.gameId)!.status).toBe('running');

    // Queueing again while playing is refused with the running game.
    a.clear();
    hub.handle(a, { type: 'queue.join', format: 'south' });
    expect(a.sent[0]).toEqual({ type: 'error', code: 'inGame' });
    expect(a.last('game.start')!.game.gameId).toBe(start.game.gameId);
    expect(hub.matchmaker.size).toBe(0);

    // A second connection takes over and is told about the game in its welcome.
    const a2 = new FakeClient('a');
    await hub.attach(a2);
    expect(a.last('takenOver')).toBeDefined();
    expect(a.closedWith?.code).toBe(4000);
    expect(a2.last('welcome')!.activeGame?.gameId).toBe(start.game.gameId);
    await room.idle();
    expect(a2.last('update')!.gameId).toBe(start.game.gameId);
    hub.detach(a); // the old socket closes later; must not detach the new one
    expect(hub.clients.get('a')).toBe(a2);
    expect(room.humanAt(hub.roomOf('a')!.seat).client).toBe(a2);
  });

  it('seats four compatible players together at once and keeps the queue entry across reconnects', async () => {
    const clients = ['a', 'b', 'c', 'd'].map((id) => new FakeClient(id));
    for (const c of clients) {
      await hub.attach(c);
      hub.handle(c, { type: 'queue.join', format: 'south' });
    }
    hub.detach(clients[1]);
    await vi.advanceTimersByTimeAsync(10);
    const b2 = new FakeClient('b');
    await hub.attach(b2);
    expect(b2.last('welcome')!.queued).toBe('south');
    await hub.tick();
    expect(hub.rooms.size).toBe(1);
    const room = [...hub.rooms.values()][0];
    await room.idle();
    expect(room.format).toBe('south');
    expect(room.rules.length).toBe('south');
    for (const c of [clients[0], b2, clients[2], clients[3]]) {
      expect(
        c
          .last('game.start')!
          .game.players.map((p) => p.name)
          .sort(),
      ).toEqual(['a', 'b', 'c', 'd']);
      expect(c.last('update')).toBeDefined();
    }
  });

  it('routes actions to the seat and rejects the rest', async () => {
    const a = new FakeClient('a');
    await hub.attach(a);
    a.clear();
    hub.handle(a, { type: 'act', gameId: 'x', seq: 0, action: { type: 'pass', seat: 0 } });
    expect(a.sent).toEqual([{ type: 'error', code: 'notInGame', requestSeq: 0 }]);
    const { room, seat } = await startSolo(a);
    await room.idle();
    a.clear();
    hub.handle(a, { type: 'act', gameId: 'other', seq: room.state.seq, action: { type: 'pass', seat } });
    expect(a.sent).toEqual([{ type: 'error', code: 'wrongGame', requestSeq: room.state.seq }]);
    hub.handle(a, { type: 'resync' });
    await room.idle();
    expect(a.last('update')!.seq).toBe(room.state.seq);
  });

  it('finishes a game, updates ratings and frees the players', async () => {
    const a = new FakeClient('a');
    await hub.attach(a);
    const { room } = await startSolo(a);
    const botIds = room.seats.flatMap((s) => (s.kind === 'bot' ? [s.userId!] : []));
    hub.detach(a); // leave: bots finish the game once abandoned
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    await vi.runAllTimersAsync();
    await room.idle();
    expect(room.finished).toBe(true);
    expect(hub.rooms.size).toBe(0);
    expect(hub.roomOf('a')).toBeUndefined();
    const r = store.ratings.get('a')!;
    expect(r.games).toBe(1);
    // The bot players were rated too, and the pool knows their new ratings; they rest before playing again.
    for (const id of botIds) {
      expect(store.ratings.get(id)!.games).toBe(31);
      const b = hub.bots.bots.get(id)!;
      expect(b.rating).toBe(store.ratings.get(id)!.rating);
      expect(b.state).toBe('idle');
      expect(b.lastOpponents.has('a')).toBe(true);
    }
    const a2 = new FakeClient('a');
    await hub.attach(a2);
    expect(a2.last('welcome')!.rating).toEqual(r);
    expect(a2.last('welcome')!.activeGame).toBeNull();
  });

  it('shutdown tells clients to reconnect later and stops the rooms', async () => {
    const a = new FakeClient('a');
    await hub.attach(a);
    await startSolo(a);
    hub.shutdown();
    expect(a.last('server.restarting')).toBeDefined();
    expect(a.closedWith?.code).toBe(1001);
    const seq = hub.roomOf('a')!.room.state.seq;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(hub.roomOf('a')!.room.state.seq).toBe(seq);
  });
});
