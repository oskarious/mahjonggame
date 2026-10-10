import { vi } from 'vitest';
import { nextUint32, seedRng } from '@mahjong/engine';
import type { BotSchedule, RatingInfo, ServerMessage } from '@mahjong/protocol';
import { DEFAULT_CONFIG, type Config } from '../src/config.ts';
import type { Hub, HubClient } from '../src/hub.ts';
import type { SeatInit } from '../src/matchmaking.ts';
import type { BotRow, MemoryStore } from '../src/store.ts';

/** Background games off unless a test turns them on. */
/** Countdowns and the joining phase off, so tests control timing; tests of those set them. */
export const TEST_CONFIG: Config = {
  ...DEFAULT_CONFIG,
  databaseUrl: 'memory',
  botsBackground: false,
  startCountdownMs: 0,
  handCountdownMs: 0,
  joinMaxMs: 0,
};

/** Deterministic `random` for tests. */
export function seeded(seed: string): () => number {
  const s = seedRng(seed);
  return () => nextUint32(s) / 0x100000000;
}

/** A Tokyo evening player (18:00–24:00 every day). */
export const TEST_SCHEDULE: BotSchedule = {
  tz: 'Asia/Tokyo',
  weekday: [1080, 1440],
  weekend: [1080, 1440],
  appetiteMin: 120,
};

/** Bot players in the store, named mockbot1, mockbot2, … with the given ratings. */
export async function addBots(
  store: MemoryStore,
  ratings: number[],
  games = 30,
  schedule = TEST_SCHEDULE,
): Promise<BotRow[]> {
  const out: BotRow[] = [];
  for (const rating of ratings) {
    const row = (await store.createBot({ name: `mockbot${store.bots.size + 1}`, skill: 0.3, rating, schedule }))!;
    store.ratings.set(row.id, { rating, games });
    out.push({ ...row, games });
  }
  return out;
}

/** A bot-player seat for rooms built directly in tests. */
export const botSeat = (id: string, rating = 1100, games = 30, skill = 0.5): SeatInit => ({
  kind: 'bot',
  skill,
  userId: id,
  name: id,
  rating,
  games,
});

/** Advances fake time a second at a time, ticking the hub, until `done()` or `maxSeconds` pass. Returns seconds used. */
export async function tickUntil(hub: Hub, done: () => boolean, maxSeconds = 120): Promise<number> {
  for (let s = 0; s < maxSeconds; s++) {
    if (done()) return s;
    await vi.advanceTimersByTimeAsync(1_000);
    await hub.tick();
  }
  if (done()) return maxSeconds;
  throw new Error(`condition not met within ${maxSeconds} s`);
}

/** A connection that records what it is sent. */
export class FakeClient implements HubClient {
  readonly user: { id: string; name: string };
  rating: RatingInfo = { rating: 1000, games: 0 };
  sent: ServerMessage[] = [];
  closedWith: { code: number; reason: string } | null = null;

  constructor(id: string, name = id) {
    this.user = { id, name };
  }

  send(msg: ServerMessage): void {
    this.sent.push(msg);
  }

  close(code: number, reason: string): void {
    this.closedWith = { code, reason };
  }

  /** Last message of a type, or undefined. */
  last<T extends ServerMessage['type']>(type: T): Extract<ServerMessage, { type: T }> | undefined {
    for (let i = this.sent.length - 1; i >= 0; i--) {
      if (this.sent[i].type === type) return this.sent[i] as Extract<ServerMessage, { type: T }>;
    }
    return undefined;
  }

  all<T extends ServerMessage['type']>(type: T): Extract<ServerMessage, { type: T }>[] {
    return this.sent.filter((m) => m.type === type) as Extract<ServerMessage, { type: T }>[];
  }

  clear(): void {
    this.sent = [];
  }
}
