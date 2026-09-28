// The /internal admin API over real HTTP.
import type { AddressInfo } from 'node:net';
import type { AdminBot, AdminPoolSnapshot, BotSettings } from '@mahjong/protocol';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Hub } from '../src/hub.ts';
import { type GameServer, createGameServer } from '../src/server.ts';
import { MemoryStore } from '../src/store.ts';
import { TEST_CONFIG, addBots, seeded } from './helpers.ts';

const TOKEN = 'x'.repeat(40);
let server: GameServer;
let closed: GameServer;
let store: MemoryStore;
let hub: Hub;
let base: string;
let closedBase: string;

async function listen(s: GameServer): Promise<string> {
  await new Promise<void>((r) => s.http.listen(0, '127.0.0.1', r));
  return `http://127.0.0.1:${(s.http.address() as AddressInfo).port}`;
}

beforeAll(async () => {
  store = new MemoryStore();
  await addBots(store, [1000, 1100, 1200]);
  const config = { ...TEST_CONFIG, internalToken: TOKEN };
  hub = new Hub({ store, config, random: seeded('admin'), log: () => {} });
  await hub.bots.load();
  await hub.bots.updateSettings({ botPoolMin: 0 });
  server = createGameServer(hub, config);
  base = await listen(server);
  closed = createGameServer(hub, { ...TEST_CONFIG, internalToken: null });
  closedBase = await listen(closed);
});

afterAll(async () => {
  await server.close();
  await closed.close();
});

const call = (method: string, path: string, body?: unknown, token: string | null = TOKEN, at = base) =>
  fetch(`${at}${path}`, {
    method,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), 'content-type': 'application/json' },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('/internal', () => {
  it('needs the token, and is off without one configured', async () => {
    expect((await call('GET', '/internal/bots', undefined, null)).status).toBe(401);
    expect((await call('GET', '/internal/bots', undefined, 'y'.repeat(40))).status).toBe(401);
    expect((await call('PUT', '/internal/settings', { idleReserve: 1 }, 'wrong')).status).toBe(401);
    expect(hub.bots.settings.idleReserve).toBe(30);
    expect((await call('GET', '/internal/bots', undefined, TOKEN, closedBase)).status).toBe(404);
  });

  it('lists the pool with live state', async () => {
    const res = await call('GET', '/internal/bots');
    expect(res.status).toBe(200);
    const body = (await res.json()) as AdminPoolSnapshot;
    expect(body.counts).toMatchObject({ active: 3, retired: 0, idle: 3 });
    expect(body.bots).toHaveLength(3);
    expect(body.bots[0]).toMatchObject({ name: 'mockbot1', rating: 1000, games: 30, state: 'idle', active: true });
    expect(body.live).toEqual({ rooms: 0, humanRooms: 0, humansQueued: 0 });
    expect(body.settings.botPoolMin).toBe(0);
  });

  it('creates, renames and retires bots', async () => {
    let res = await call('POST', '/internal/bots', { count: 2, minRating: 1050, maxRating: 1150 });
    expect(res.status).toBe(200);
    const { created } = (await res.json()) as { created: AdminBot[] };
    expect(created).toHaveLength(2);
    res = await call('POST', '/internal/bots', { name: 'QuietHeron', skill: 0.4 });
    expect(res.status).toBe(200);
    res = await call('POST', '/internal/bots', { name: 'quietheron' });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'That name is taken' });

    const id = created[0].id;
    res = await call('PATCH', `/internal/bots/${id}`, { name: 'LuckyOtter', active: false });
    expect(res.status).toBe(200);
    expect(hub.bots.bots.get(id)).toMatchObject({ name: 'LuckyOtter', active: false });
    expect(store.bots.get(id)).toMatchObject({ name: 'LuckyOtter', active: false });
    res = await call('PATCH', '/internal/bots/nope', { active: false });
    expect(res.status).toBe(404);
    res = await call('PATCH', `/internal/bots/${id}`, { name: 'QuietHeron' });
    expect(res.status).toBe(400);
  });

  it('validates and persists settings', async () => {
    let res = await call('PUT', '/internal/settings', { botPoolMin: 5000, botPoolMax: 10 });
    expect(res.status).toBe(400);
    expect(hub.bots.settings.botPoolMax).toBe(1000);
    res = await call('PUT', '/internal/settings', '{not json');
    expect(res.status).toBe(400);
    res = await call('PUT', '/internal/settings', { idleReserve: 12, thinkScale: 1.5, botArrivalMs: [1000, 4000] });
    expect(res.status).toBe(200);
    expect(((await res.json()) as { settings: BotSettings }).settings).toMatchObject({ idleReserve: 12, thinkScale: 1.5, botArrivalMs: [1000, 4000] });
    expect(store.settings.get('bots')).toMatchObject({ idleReserve: 12 });
    expect((await call('GET', '/internal/nothing')).status).toBe(404);
  });
});
