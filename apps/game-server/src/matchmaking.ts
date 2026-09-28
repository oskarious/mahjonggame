// In-memory quick-play queues, one per format. `tick()` forms tables; the hub starts the games.
import { skillForElo } from '@mahjong/engine';
import type { Format } from '@mahjong/protocol';
import type { Config } from './config.ts';

export interface QueueEntry {
  userId: string;
  name: string;
  rating: number;
  games: number;
  joinedAt: number;
}

export type SeatInit =
  | { kind: 'human'; userId: string; name: string; rating: number; games: number }
  | { kind: 'bot'; skill: number };

export interface Match {
  format: Format;
  /** Four seats in seat order (already shuffled). */
  seats: SeatInit[];
}

type MatchConfig = Pick<Config, 'fillDelayMs' | 'windowBase' | 'windowPerSecond' | 'windowMax'>;

export class Matchmaker {
  #queues = new Map<Format, QueueEntry[]>();
  #config: MatchConfig;
  #random: () => number;

  constructor(config: MatchConfig, random: () => number = Math.random) {
    this.#config = config;
    this.#random = random;
  }

  /** Adds or moves the player to this format's queue (a player is in at most one queue). */
  join(entry: QueueEntry, format: Format): void {
    this.leave(entry.userId);
    const q = this.#queues.get(format) ?? [];
    q.push(entry);
    this.#queues.set(format, q);
  }

  leave(userId: string): void {
    for (const q of this.#queues.values()) {
      const i = q.findIndex((e) => e.userId === userId);
      if (i >= 0) q.splice(i, 1);
    }
  }

  /** The format the player is queued for, if any. */
  formatOf(userId: string): Format | null {
    for (const [f, q] of this.#queues) if (q.some((e) => e.userId === userId)) return f;
    return null;
  }

  waitedMs(userId: string, now: number): number | null {
    for (const q of this.#queues.values()) {
      const e = q.find((x) => x.userId === userId);
      if (e) return now - e.joinedAt;
    }
    return null;
  }

  *queued(): IterableIterator<{ entry: QueueEntry; format: Format }> {
    for (const [format, q] of this.#queues) for (const entry of q) yield { entry, format };
  }

  get size(): number {
    let n = 0;
    for (const q of this.#queues.values()) n += q.length;
    return n;
  }

  /** Acceptable rating gap for someone who has waited `waitedMs`. */
  window(waitedMs: number): number {
    const c = this.#config;
    return Math.min(c.windowMax, c.windowBase + (c.windowPerSecond * waitedMs) / 1000);
  }

  /**
   * Forms tables: for the oldest waiter, the closest mutually compatible players (each pair within both windows).
   * Four start at once; fewer start with bots once the oldest waiter has waited the fill delay.
   */
  tick(now: number): Match[] {
    const matches: Match[] = [];
    for (const [format, q] of this.#queues) {
      let progress = true;
      while (progress && q.length) {
        progress = false;
        const oldest = q.reduce((a, b) => (b.joinedAt < a.joinedAt ? b : a));
        const group = this.#groupFor(oldest, q, now);
        const waited = now - oldest.joinedAt;
        if (group.length === 4 || waited >= this.#config.fillDelayMs) {
          for (const e of group) q.splice(q.indexOf(e), 1);
          matches.push(this.#match(format, group));
          progress = true;
        }
      }
    }
    return matches;
  }

  #compatible(a: QueueEntry, b: QueueEntry, now: number): boolean {
    const gap = Math.abs(a.rating - b.rating);
    return gap <= this.window(now - a.joinedAt) && gap <= this.window(now - b.joinedAt);
  }

  #groupFor(seed: QueueEntry, q: QueueEntry[], now: number): QueueEntry[] {
    const group = [seed];
    const candidates = q
      .filter((e) => e !== seed)
      .sort((a, b) => Math.abs(a.rating - seed.rating) - Math.abs(b.rating - seed.rating) || a.joinedAt - b.joinedAt);
    for (const c of candidates) {
      if (group.length === 4) break;
      if (group.every((g) => this.#compatible(g, c, now))) group.push(c);
    }
    return group;
  }

  #match(format: Format, humans: QueueEntry[]): Match {
    const mean = humans.reduce((a, e) => a + e.rating, 0) / humans.length;
    const skill = skillForElo(mean);
    const seats: SeatInit[] = humans.map((h) => ({
      kind: 'human',
      userId: h.userId,
      name: h.name,
      rating: h.rating,
      games: h.games,
    }));
    while (seats.length < 4) seats.push({ kind: 'bot', skill });
    for (let i = seats.length - 1; i > 0; i--) {
      const j = Math.floor(this.#random() * (i + 1));
      [seats[i], seats[j]] = [seats[j], seats[i]];
    }
    return { format, seats };
  }
}
