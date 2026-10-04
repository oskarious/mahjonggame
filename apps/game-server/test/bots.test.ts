import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { botElo } from '@mahjong/engine';
import { isValidUsername } from '@mahjong/protocol';
import type { Config } from '../src/config.ts';
import { Hub } from '../src/hub.ts';
import { replayGame } from '../src/recovery.ts';
import type { Room } from '../src/room.ts';
import type { BotSettings } from '../src/settings.ts';
import { MemoryStore } from '../src/store.ts';
import { FakeClient, TEST_CONFIG, addBots, seeded, tickUntil } from './helpers.ts';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

interface Setup {
  hub: Hub;
  store: MemoryStore;
}

async function setup(
  ratings: number[],
  o: { seed?: string; config?: Partial<Config>; settings?: Partial<BotSettings>; games?: number; store?: MemoryStore } = {},
): Promise<Setup> {
  const store = o.store ?? new MemoryStore();
  await addBots(store, ratings, o.games ?? 30);
  const hub = new Hub({ store, config: { ...TEST_CONFIG, ...o.config }, random: seeded(o.seed ?? 'bots'), log: () => {} });
  await hub.bots.load();
  // No automatic top-up to the default pool size: tests work with the bots they add. Schedules off unless a test turns
  // them on (every bot online).
  const r = await hub.bots.updateSettings({ botPoolMin: 0, schedulesEnabled: false, ...o.settings });
  if ('error' in r) throw new Error(r.error);
  return { hub, store };
}

async function queue(hub: Hub, id: string, rating = 1000, format: 'east' | 'south' = 'east'): Promise<FakeClient> {
  const c = new FakeClient(id);
  await hub.attach(c);
  c.rating = { rating, games: 0 };
  hub.handle(c, { type: 'queue.join', format });
  return c;
}

const botsOf = (room: Room) => room.seats.flatMap((s) => (s.kind === 'bot' ? [s.userId!] : [])).sort();
const humansOf = (room: Room) => room.seats.flatMap((s) => (s.kind === 'human' ? [s.userId] : [])).sort();
const queuedBots = (hub: Hub) => [...hub.matchmaker.queued()].filter((q) => q.entry.bot).map((q) => q.entry.userId);
/** Let promise chains (game creation in the background) settle without running timers. */
const flush = async () => {
  for (let i = 0; i < 20; i++) await Promise.resolve();
};

const POOL = [940, 960, 980, 1000, 1010, 1030, 1050, 1080, 1120, 1200, 1250, 1300];

describe('summoning bot players for waiting humans', () => {
  it('a solo player gets three bot players who join one at a time', async () => {
    const { hub } = await setup(POOL);
    await queue(hub, 'a');
    const joinedAt = new Map<string, number>();
    const start = Date.now();
    await tickUntil(hub, () => {
      for (const id of queuedBots(hub)) if (!joinedAt.has(id)) joinedAt.set(id, Date.now() - start);
      return !!hub.roomOf('a');
    });
    const { room } = hub.roomOf('a')!;
    expect(humansOf(room)).toEqual(['a']);
    expect(botsOf(room)).toHaveLength(3);
    // Each seated bot joined the queue at its own moment, after the summon delay.
    const times = botsOf(room).map((id) => joinedAt.get(id));
    expect(times.every((t) => t !== undefined && t >= 3_000)).toBe(true);
    expect(new Set(times).size).toBe(3);
    // Close to the player's rating.
    for (const id of botsOf(room)) expect(Math.abs(hub.bots.bots.get(id)!.rating - 1000)).toBeLessThanOrEqual(150 + 20 * 40);
  });

  it('the wait is different from game to game', async () => {
    const waits = new Set<number>();
    for (const seed of ['s1', 's2', 's3', 's4', 's5', 's6']) {
      const { hub } = await setup(POOL, { seed });
      await queue(hub, 'a');
      waits.add(await tickUntil(hub, () => !!hub.roomOf('a')));
    }
    expect(waits.size).toBeGreaterThan(2);
    expect(Math.min(...waits)).toBeGreaterThanOrEqual(5);
  });

  it('two close players are seated together with two bot players', async () => {
    const { hub } = await setup(POOL);
    await queue(hub, 'a', 1000);
    await queue(hub, 'b', 1020);
    await tickUntil(hub, () => !!hub.roomOf('a'));
    const { room } = hub.roomOf('a')!;
    expect(humansOf(room)).toEqual(['a', 'b']);
    expect(botsOf(room)).toHaveLength(2);
  });

  it('a human who queues during the wait takes a seat instead of a bot still to come', async () => {
    const { hub } = await setup(POOL);
    await queue(hub, 'a', 1000);
    await tickUntil(hub, () => queuedBots(hub).length === 1);
    await queue(hub, 'b', 1000);
    await tickUntil(hub, () => !!hub.roomOf('a'));
    const { room } = hub.roomOf('a')!;
    expect(humansOf(room)).toEqual(['a', 'b']);
    expect(botsOf(room)).toHaveLength(2);
  });

  it('leaving the queue withdraws the bots that joined for you, and no game starts', async () => {
    const { hub } = await setup(POOL);
    const a = await queue(hub, 'a');
    await tickUntil(hub, () => queuedBots(hub).length === 2);
    const summoned = queuedBots(hub);
    hub.handle(a, { type: 'queue.leave' });
    await tickUntil(hub, () => false, 60).catch(() => {});
    expect(hub.matchmaker.size).toBe(0);
    expect(hub.rooms.size).toBe(0);
    for (const id of summoned) expect(hub.bots.bots.get(id)).toMatchObject({ state: 'idle', forUserId: null });
  });

  it('never summons a busy bot; when all fitting bots are busy it creates new ones', async () => {
    const { hub, store } = await setup([990, 1000, 1010], { settings: { growAfterMs: 20_000 } });
    await queue(hub, 'a');
    await tickUntil(hub, () => !!hub.roomOf('a'));
    const first = botsOf(hub.roomOf('a')!.room);
    expect(first).toHaveLength(3);
    await queue(hub, 'b');
    const waited = await tickUntil(hub, () => !!hub.roomOf('b'));
    expect(waited).toBeGreaterThanOrEqual(20);
    const second = botsOf(hub.roomOf('b')!.room);
    expect(second.filter((id) => first.includes(id))).toEqual([]);
    expect(store.bots.size).toBe(6);
    expect(hub.bots.snapshot().lastGrownAt).not.toBeNull();
    // Bots created on demand start at the calibrated Elo of a skill near the player's rating.
    for (const id of second) expect(Math.abs(hub.bots.bots.get(id)!.rating - 1000)).toBeLessThan(40);
  });

  it('prefers bots that did not just play this human', async () => {
    const { hub } = await setup([990, 1000, 1010, 1020, 1030, 1040], { settings: { botRestMs: [0, 0] } });
    const a = await queue(hub, 'a');
    await tickUntil(hub, () => !!hub.roomOf('a'));
    const { room } = hub.roomOf('a')!;
    const first = botsOf(room);
    hub.detach(a);
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    await vi.runAllTimersAsync();
    await room.idle();
    expect(room.finished).toBe(true);
    await queue(hub, 'a');
    await tickUntil(hub, () => !!hub.roomOf('a'));
    expect(botsOf(hub.roomOf('a')!.room).filter((id) => first.includes(id))).toEqual([]);
  });
});

describe('the pool', () => {
  it('seeds the minimum with valid unique names, spread over the bot rating range at calibrated ratings', async () => {
    const { hub, store } = await setup([], { settings: { botPoolMin: 24 } });
    await flush();
    expect(await hub.bots.ensurePool()).toBe(0); // updateSettings already topped it up
    const bots = [...hub.bots.bots.values()];
    expect(bots).toHaveLength(24);
    expect(new Set(bots.map((b) => b.name.toLowerCase())).size).toBe(24);
    expect(bots.every((b) => isValidUsername(b.name))).toBe(true);
    for (const b of bots) {
      expect(b.rating).toBe(Math.round(botElo(b.skill)));
      expect(b.games).toBe(0);
    }
    const ratings = bots.map((b) => b.rating).sort((x, y) => x - y);
    expect(ratings[0]).toBeLessThan(botElo(0) + 40);
    expect(ratings.at(-1)!).toBeGreaterThan(botElo(1) - 60);
    // Persisted: a new process loads the same bots.
    const hub2 = new Hub({ store, config: TEST_CONFIG, log: () => {} });
    await hub2.bots.load();
    expect(hub2.bots.bots.size).toBe(24);
    expect(hub2.bots.settings.botPoolMin).toBe(24);
  });

  it('retired bots are never seated; a queued bot that is retired leaves the queue', async () => {
    const { hub } = await setup([990, 1000, 1010, 1020]);
    const retired = [...hub.bots.bots.values()].find((b) => b.rating === 1000)!;
    expect(await hub.bots.updateBot(retired.id, { active: false })).toEqual({ ok: true });
    await queue(hub, 'a');
    await tickUntil(hub, () => !!hub.roomOf('a'));
    expect(botsOf(hub.roomOf('a')!.room)).not.toContain(retired.id);

    const s = await setup([1000, 1000, 1000, 1000], { seed: 'retire-queued' });
    await queue(s.hub, 'b');
    await tickUntil(s.hub, () => queuedBots(s.hub).length === 1);
    const [queued] = queuedBots(s.hub);
    await s.hub.bots.updateBot(queued, { active: false });
    expect(queuedBots(s.hub)).toEqual([]);
    expect(s.hub.bots.bots.get(queued)).toMatchObject({ state: 'idle', active: false });
    expect(s.store.bots.get(queued)!.active).toBe(false);
  });

  it('a retired bot in a game finishes it and is rated', async () => {
    const { hub, store } = await setup([990, 1000, 1010]);
    const a = await queue(hub, 'a');
    await tickUntil(hub, () => !!hub.roomOf('a'));
    const { room } = hub.roomOf('a')!;
    const [id] = botsOf(room);
    await hub.bots.updateBot(id, { active: false });
    expect(hub.bots.bots.get(id)!.state).toBe('busy');
    hub.detach(a);
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    await vi.runAllTimersAsync();
    await room.idle();
    expect(room.finished).toBe(true);
    expect(store.ratings.get(id)!.games).toBe(31);
    expect(hub.bots.snapshot().bots.find((b) => b.id === id)!.state).toBe('retired');
  });

  it('the maximum pool counts active bots only', async () => {
    const { hub } = await setup([1000, 1010, 1020], { settings: { botPoolMax: 3 } });
    const full = 'That would be more than 3 active bots (maximum pool)';
    expect(await hub.bots.createBots({ name: 'ExtraHeron' })).toEqual({ error: full });
    expect(await hub.bots.createBots({ count: 2, minRating: 1000, maxRating: 1100 })).toEqual({ error: full });
    const [first] = [...hub.bots.bots.values()];
    await hub.bots.updateBot(first.id, { active: false });
    // 2 active + 1 retired: room for one more active bot, though there are already 3 in total.
    expect(await hub.bots.createBots({ name: 'ExtraHeron' })).toMatchObject({ created: [{ name: 'ExtraHeron' }] });
    expect(hub.bots.bots.size).toBe(4);
    expect(await hub.bots.updateBot(first.id, { active: true })).toEqual({ error: full });
    // Raising the minimum tops up active bots; retired ones are not counted either way.
    await hub.bots.updateSettings({ botPoolMax: 6, botPoolMin: 5 });
    await hub.bots.ensurePool();
    expect([...hub.bots.bots.values()].filter((b) => b.active)).toHaveLength(5);
  });

  it('rejects taken or invalid names and bad values', async () => {
    const { hub, store } = await setup([1000, 1100]);
    const [x, y] = [...hub.bots.bots.values()];
    expect(await hub.bots.updateBot(x.id, { name: y.name.toUpperCase() })).toEqual({ error: 'That name is taken' });
    expect(await hub.bots.updateBot(x.id, { name: 'no spaces' })).toEqual({ error: 'Not a valid username' });
    expect(await hub.bots.updateBot(x.id, { name: 'botty' })).toEqual({ error: 'Not a valid username' });
    expect(await hub.bots.updateBot(x.id, { skill: 2 })).toEqual({ error: 'skill must be from 0 to 1' });
    expect(await hub.bots.updateBot('nope', { skill: 0.5 })).toEqual({ error: 'No such bot' });
    expect(await hub.bots.updateBot(x.id, { name: 'SlowHeron', skill: 0.8 })).toEqual({ ok: true });
    expect(hub.bots.bots.get(x.id)).toMatchObject({ name: 'SlowHeron', skill: 0.8, rating: 1000 });
    expect(store.bots.get(x.id)).toMatchObject({ name: 'SlowHeron', skill: 0.8 });
    expect(await hub.bots.createBots({ name: 'SlowHeron' })).toEqual({ error: 'That name is taken' });
    const r = await hub.bots.createBots({ count: 5, minRating: 1100, maxRating: 1250 });
    if ('error' in r) throw new Error(r.error);
    expect(r.created).toHaveLength(5);
    for (const b of r.created) {
      expect(b.rating).toBeGreaterThanOrEqual(1099);
      expect(b.rating).toBeLessThanOrEqual(1251);
    }
    expect(await hub.bots.updateSettings({ botPoolMin: 50, botPoolMax: 40 })).toEqual({ error: 'botPoolMin must not be above botPoolMax' });
    expect(await hub.bots.updateSettings({ summonAfterMs: [5, 1] })).toMatchObject({ error: expect.stringContaining('summonAfterMs') });
    expect(await hub.bots.updateSettings({ nope: 1 })).toEqual({ error: 'Unknown setting nope' });
    expect(hub.bots.settings.botPoolMax).toBe(1000);
  });
});

describe('schedules', () => {
  // The test bots are Tokyo evening players (18:00–24:00).
  const TOKYO_EVENING = Date.UTC(2026, 9, 7, 12); // 21:00 in Tokyo
  const TOKYO_NIGHT = Date.UTC(2026, 9, 7, 19); // 04:00 in Tokyo
  const on = { config: { botsBackground: true }, settings: { schedulesEnabled: true, idleReserve: 0 } };
  const many = (n: number) => Array.from({ length: n }, (_, i) => 1000 + (i % 10) * 5);

  it('at night bots are offline: no background games, but a waiting human is served by bots that log on', async () => {
    vi.setSystemTime(TOKYO_NIGHT);
    const { hub, store } = await setup(POOL, { ...on, seed: 'night' });
    expect(hub.bots.snapshot().counts).toMatchObject({ active: 12, online: 0, offline: 12 });
    await tickUntil(hub, () => false, 120).catch(() => {});
    expect(hub.rooms.size).toBe(0);

    await queue(hub, 'a');
    await tickUntil(hub, () => !!hub.roomOf('a'));
    expect(store.bots.size).toBe(12); // no new bots while offline ones fit
    expect(botsOf(hub.roomOf('a')!.room)).toHaveLength(3);
    expect(hub.bots.snapshot().counts).toMatchObject({ online: 3, offline: 9, busy: 3 });
  });

  it('in the evening some bots are online, and background games seat only those', async () => {
    vi.setSystemTime(TOKYO_EVENING);
    const { hub } = await setup(many(40), { ...on, seed: 'evening' });
    const { online } = hub.bots.snapshot().counts;
    expect(online).toBeGreaterThan(4);
    expect(online).toBeLessThan(30);
    const wasOnline = new Set([...hub.bots.bots.values()].filter((b) => b.onlineUntil > Date.now()).map((b) => b.id));
    await hub.tick();
    await flush();
    expect(hub.rooms.size).toBe(1);
    for (const id of botsOf([...hub.rooms.values()][0])) expect(wasOnline.has(id)).toBe(true);
  });

  it('onlineIds lists the active bots online now, including those in a game', async () => {
    vi.setSystemTime(TOKYO_NIGHT);
    const { hub } = await setup(POOL, { ...on, seed: 'night' });
    expect(hub.bots.onlineIds()).toEqual([]);
    expect(hub.bots.activeCount()).toBe(POOL.length);
    await queue(hub, 'a');
    await tickUntil(hub, () => !!hub.roomOf('a'));
    expect(hub.bots.onlineIds().sort()).toEqual(botsOf(hub.roomOf('a')!.room));
  });

  it('offline bots start sessions over time in their evening', async () => {
    vi.setSystemTime(TOKYO_EVENING);
    const { hub } = await setup(many(40), { settings: { schedulesEnabled: true }, seed: 'sessions' });
    for (const b of hub.bots.bots.values()) b.onlineUntil = 0;
    await tickUntil(hub, () => hub.bots.snapshot().counts.online >= 5, 30 * 60);
  });

  it('a bot whose session ends mid-game plays it to the end, then goes offline', async () => {
    vi.setSystemTime(TOKYO_NIGHT);
    const { hub, store } = await setup([990, 1000, 1010], { settings: { schedulesEnabled: true } });
    const a = await queue(hub, 'a');
    await tickUntil(hub, () => !!hub.roomOf('a'));
    const { room } = hub.roomOf('a')!;
    const ids = botsOf(room);
    for (const id of ids) hub.bots.bots.get(id)!.onlineUntil = Date.now() + 1_000;
    await tickUntil(hub, () => false, 10).catch(() => {});
    // Still playing, so still online.
    for (const id of ids) expect(hub.bots.snapshot().bots.find((b) => b.id === id)).toMatchObject({ state: 'busy', online: true });
    hub.detach(a);
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    await vi.runAllTimersAsync();
    await room.idle();
    expect(room.finished).toBe(true);
    for (const id of ids) {
      expect(store.ratings.get(id)!.games).toBe(31);
      expect(hub.bots.snapshot().bots.find((b) => b.id === id)).toMatchObject({ state: 'offline', online: false });
    }
  });

  it('switched off, every bot plays at any hour', async () => {
    vi.setSystemTime(TOKYO_NIGHT);
    const { hub } = await setup(POOL, on);
    await hub.tick();
    await flush();
    expect(hub.rooms.size).toBe(0);
    await hub.bots.updateSettings({ schedulesEnabled: false });
    expect(hub.bots.snapshot().counts).toMatchObject({ online: 12, offline: 0 });
    vi.setSystemTime(Date.now() + 120_000);
    await hub.tick();
    await flush();
    expect(hub.rooms.size).toBe(1);
  });

  it('warm-up ignores schedules', async () => {
    vi.setSystemTime(TOKYO_NIGHT);
    const { hub } = await setup(POOL, { ...on, games: 0 });
    expect(hub.bots.warmingUp).toBe(true);
    expect(hub.bots.snapshot().counts.online).toBe(0);
    await hub.tick();
    await flush();
    expect(hub.rooms.size).toBe(1);
  });

  it('bots stored without a schedule get one, kept across restarts; new bots get one too', async () => {
    const store = new MemoryStore();
    await addBots(store, [1000, 1100]);
    for (const b of store.bots.values()) b.schedule = null;
    const hub = new Hub({ store, config: TEST_CONFIG, random: seeded('legacy'), log: () => {} });
    await hub.bots.load();
    const given = [...store.bots.values()].map((b) => b.schedule);
    expect(given.every((s) => s !== null && typeof s.tz === 'string')).toBe(true);
    const hub2 = new Hub({ store, config: TEST_CONFIG, random: seeded('legacy2'), log: () => {} });
    await hub2.bots.load();
    expect([...hub2.bots.bots.values()].map((b) => b.schedule)).toEqual(given);
    const r = await hub2.bots.createBots({ name: 'NewHeron' });
    if ('error' in r) throw new Error(r.error);
    expect(r.created[0].schedule.appetiteMin).toBeGreaterThanOrEqual(90);
    expect(store.bots.get(r.created[0].id)!.schedule).toEqual(r.created[0].schedule);
  });

  it('validates the schedule settings', async () => {
    const { hub } = await setup([]);
    expect(await hub.bots.updateSettings({ regions: [] })).toMatchObject({ error: expect.stringContaining('regions') });
    expect(await hub.bots.updateSettings({ regions: [{ tz: 'Mars/Olympus', weight: 1 }] })).toMatchObject({
      error: expect.stringContaining('regions'),
    });
    expect(await hub.bots.updateSettings({ regions: [{ tz: 'Asia/Tokyo', weight: 0 }] })).toMatchObject({
      error: expect.stringContaining('regions'),
    });
    expect(await hub.bots.updateSettings({ sessionMin: [0, 60] })).toMatchObject({ error: expect.stringContaining('minutes') });
    expect(await hub.bots.updateSettings({ appetiteMin: [200, 100] })).toMatchObject({ error: expect.stringContaining('appetiteMin') });
    expect(await hub.bots.updateSettings({ schedulesEnabled: 'yes' })).toMatchObject({ error: expect.stringContaining('schedulesEnabled') });
    const ok = await hub.bots.updateSettings({ regions: [{ tz: 'Europe/Paris', weight: 2 }], sessionMin: [30, 60] });
    expect(ok).toMatchObject({ settings: { regions: [{ tz: 'Europe/Paris', weight: 2 }], sessionMin: [30, 60] } });
  });
});

describe('background games', () => {
  const on = { config: { botsBackground: true } };

  it('seats close-rated idle bots at a table of their own, played and rated like any game', async () => {
    const { hub, store } = await setup(POOL, { ...on, settings: { idleReserve: 0 } });
    await hub.tick();
    await flush();
    expect(hub.rooms.size).toBe(1);
    const room = [...hub.rooms.values()][0];
    expect(room.hasHumans).toBe(false);
    const ids = botsOf(room);
    expect(ids).toHaveLength(4);
    for (const id of ids) expect(hub.bots.bots.get(id)).toMatchObject({ state: 'busy', roomId: room.id });
    const ratings = ids.map((id) => hub.bots.bots.get(id)!.rating);
    expect(Math.max(...ratings) - Math.min(...ratings)).toBeLessThanOrEqual(300);

    // A human arriving now gets other bots.
    await queue(hub, 'a');
    await tickUntil(hub, () => !!hub.roomOf('a'));
    expect(botsOf(hub.roomOf('a')!.room).filter((id) => ids.includes(id))).toEqual([]);

    // The background game runs at human pace to the end and rates all four.
    hub.bots.stop(); // no more background games from here on
    await vi.advanceTimersByTimeAsync(6 * 60_000);
    await room.idle();
    expect(room.finished).toBe(false);
    await vi.runAllTimersAsync();
    await room.idle();
    expect(room.finished).toBe(true);
    const rec = store.games.get(room.id)!;
    expect(rec.status).toBe('finished');
    expect(rec.results.every((r) => r.ratingAfter !== null)).toBe(true);
    for (const id of ids) expect(store.ratings.get(id)!.games).toBe(31);
  });

  it('keeps the idle reserve free for humans', async () => {
    const few = await setup([1000, 1010, 1020, 1030, 1040, 1050], { ...on, settings: { idleReserve: 3, backgroundEveryMs: 1_000 } });
    await tickUntil(few.hub, () => false, 30).catch(() => {});
    expect(few.hub.rooms.size).toBe(0);
    const enough = await setup([1000, 1010, 1020, 1030, 1040, 1050, 1060], { ...on, settings: { idleReserve: 3 } });
    await enough.hub.tick();
    await flush();
    expect(enough.hub.rooms.size).toBe(1);
  });

  it('can be switched off at runtime and by the environment', async () => {
    const off = await setup(POOL, { ...on, settings: { idleReserve: 0, backgroundEnabled: false } });
    await off.hub.tick();
    await flush();
    expect(off.hub.rooms.size).toBe(0);
    const env = await setup(POOL, { settings: { idleReserve: 0 } }); // TEST_CONFIG: botsBackground false
    await env.hub.tick();
    await flush();
    expect(env.hub.rooms.size).toBe(0);
  });

  it('warms up a new pool with fast games, at most warmupTables at once', async () => {
    const { hub } = await setup(POOL, { ...on, games: 0, settings: { warmupTables: 1 } });
    expect(hub.bots.warmingUp).toBe(true);
    await hub.tick();
    await flush();
    expect(hub.rooms.size).toBe(1);
    vi.setSystemTime(Date.now() + 5_000); // interval passed, but the table cap holds (no timers run)
    await hub.tick();
    await flush();
    expect(hub.rooms.size).toBe(1);
    const room = [...hub.rooms.values()][0];
    for (let i = 0; i < 20_000 && !room.finished; i++) await vi.advanceTimersByTimeAsync(1);
    expect(room.finished).toBe(true);
    // Warm-up bots skip the rest and the next fast game can start.
    for (const id of botsOf(room)) expect(hub.bots.bots.get(id)!.restUntil).toBeLessThanOrEqual(Date.now());
    vi.setSystemTime(Date.now() + 5_000);
    await hub.tick();
    await flush();
    expect(hub.rooms.size).toBe(1);
    expect([...hub.rooms.values()][0].id).not.toBe(room.id);
  });

  it('a background game is resumed after a restart', async () => {
    const store = new MemoryStore();
    const first = await setup(POOL, { ...on, store, settings: { idleReserve: 0 } });
    await first.hub.tick();
    await flush();
    const room1 = [...first.hub.rooms.values()][0];
    await vi.advanceTimersByTimeAsync(60_000);
    await room1.idle();
    const cut = room1.state.seq;
    expect(cut).toBeGreaterThan(5);
    first.hub.shutdown();

    const hub2 = new Hub({ store, config: { ...TEST_CONFIG, botsBackground: false }, random: seeded('restart'), log: () => {} });
    await hub2.bots.load();
    expect(await hub2.recover((g) => replayGame(g.rules, g.seed, g.actions))).toBe(1);
    const room2 = hub2.rooms.get(room1.id)!;
    expect(room2.state.seq).toBe(cut);
    for (const id of botsOf(room2)) expect(hub2.bots.bots.get(id)!.state).toBe('busy');
    await vi.runAllTimersAsync();
    await room2.idle();
    expect(room2.finished).toBe(true);
    for (const id of botsOf(room2)) expect(hub2.bots.bots.get(id)!.state).toBe('idle');
  });
});
