// In-memory quick-play queues, one per format. `tick()` forms full tables; the hub starts the games. Bot players join
// the queue like humans (summoned by the BotPool for a waiting human); there is no automatic fill.
import { botElo } from '@mahjong/engine';
import type { Format } from '@mahjong/protocol';
import type { Config } from './config.ts';

export interface QueueEntry {
  userId: string;
  name: string;
  rating: number;
  games: number;
  joinedAt: number;
  /**
   * Set for bot players: the human they joined for, and the time their rating window counts from (that human's
   * `joinedAt`, so a bot is exactly as flexible as the player it came for).
   */
  bot?: { skill: number; forUserId: string; windowFrom: number };
}

/** A rated identity at a table: a human account or a bot player. */
export interface PlayerInit {
  userId: string;
  name: string;
  /** Rating and rated games at the start of the game. */
  rating: number;
  games: number;
}

/**
 * A seat at the start of a game. Bot players have an account (`userId`) and are rated like humans; `userId: null` is
 * an anonymous bot with a fixed rating, only found in games recovered from before bot players existed.
 */
export type SeatInit =
  | ({ kind: 'human' } & PlayerInit)
  | ({ kind: 'bot'; skill: number } & Omit<PlayerInit, 'userId'> & { userId: string | null });

/** The anonymous bot of old records: named "Bot", fixed at its calibrated Elo. */
export function anonymousBot(skill: number): SeatInit {
  return { kind: 'bot', skill, userId: null, name: 'Bot', rating: Math.round(botElo(skill)), games: 0 };
}

export interface Match {
  format: Format;
  /** Four seats in seat order (already shuffled). */
  seats: SeatInit[];
}

type MatchConfig = Pick<Config, 'windowBase' | 'windowPerSecond' | 'windowMax'>;

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

  entry(userId: string): QueueEntry | null {
    for (const q of this.#queues.values()) {
      const e = q.find((x) => x.userId === userId);
      if (e) return e;
    }
    return null;
  }

  waitedMs(userId: string, now: number): number | null {
    const e = this.entry(userId);
    return e ? now - e.joinedAt : null;
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
   * Forms tables: for each waiting human (oldest first), the closest mutually compatible players, humans before bots.
   * Only full tables of four start, so every table contains at least one human.
   */
  tick(now: number): Match[] {
    const matches: Match[] = [];
    for (const [format, q] of this.#queues) {
      let progress = true;
      while (progress) {
        progress = false;
        const seeds = q.filter((e) => !e.bot).sort((a, b) => a.joinedAt - b.joinedAt);
        for (const seed of seeds) {
          const group = this.#groupFor(seed, q, now);
          if (group.length < 4) continue;
          for (const e of group) q.splice(q.indexOf(e), 1);
          matches.push(this.#match(format, group));
          progress = true;
          break;
        }
      }
    }
    return matches;
  }

  /** The table that would form around this queued human right now (fewer than 4 = not yet). */
  groupFor(userId: string, now: number): QueueEntry[] {
    for (const q of this.#queues.values()) {
      const seed = q.find((e) => e.userId === userId);
      if (seed) return this.#groupFor(seed, q, now);
    }
    return [];
  }

  /** Whether a bot player with this rating, joining for this human, would fit the human's current group. */
  fits(userId: string, rating: number, now: number): boolean {
    const seed = this.entry(userId);
    if (!seed || seed.bot) return false;
    const group = this.groupFor(userId, now);
    if (group.length >= 4) return false;
    const candidate: QueueEntry = {
      userId: '',
      name: '',
      rating,
      games: 0,
      joinedAt: now,
      bot: { skill: 0, forUserId: userId, windowFrom: seed.joinedAt },
    };
    return group.every((g) => this.#compatible(g, candidate, now));
  }

  #windowFrom(e: QueueEntry): number {
    return e.bot?.windowFrom ?? e.joinedAt;
  }

  #compatible(a: QueueEntry, b: QueueEntry, now: number): boolean {
    const gap = Math.abs(a.rating - b.rating);
    return gap <= this.window(now - this.#windowFrom(a)) && gap <= this.window(now - this.#windowFrom(b));
  }

  #groupFor(seed: QueueEntry, q: QueueEntry[], now: number): QueueEntry[] {
    const group = [seed];
    const candidates = q
      .filter((e) => e !== seed)
      .sort(
        (a, b) =>
          Number(!!a.bot) - Number(!!b.bot) ||
          Math.abs(a.rating - seed.rating) - Math.abs(b.rating - seed.rating) ||
          a.joinedAt - b.joinedAt,
      );
    for (const c of candidates) {
      if (group.length === 4) break;
      if (group.every((g) => this.#compatible(g, c, now))) group.push(c);
    }
    return group;
  }

  #match(format: Format, entries: QueueEntry[]): Match {
    const seats: SeatInit[] = entries.map((e) =>
      e.bot
        ? { kind: 'bot', skill: e.bot.skill, userId: e.userId, name: e.name, rating: e.rating, games: e.games }
        : { kind: 'human', userId: e.userId, name: e.name, rating: e.rating, games: e.games },
    );
    return { format, seats: shuffle(seats, this.#random) };
  }
}

/** Fisher-Yates in place; returns the array. */
export function shuffle<T>(xs: T[], random: () => number): T[] {
  for (let i = xs.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [xs[i], xs[j]] = [xs[j], xs[i]];
  }
  return xs;
}
