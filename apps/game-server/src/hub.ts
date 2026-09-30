// Everything that is not one game: connected users, the queue, the bot players, the rooms, and routing of client
// messages.
import { DEFAULT_RULES, type HintLevel, makeRules } from '@mahjong/engine';
import type { ClientMessage, Format, GameInfo, RatingInfo, ServerMessage } from '@mahjong/protocol';
import { randomUUID } from 'node:crypto';
import { BotPool } from './bots.ts';
import type { Config } from './config.ts';
import { type Match, Matchmaker } from './matchmaking.ts';
import { type Client, Room } from './room.ts';
import type { RatingUpdate, Store, StoredGame } from './store.ts';

/** What the hub needs from a connection. */
export interface HubClient extends Client {
  readonly user: { id: string; name: string };
  rating: RatingInfo;
  /** Hint level the client asked for (never more than the rating allows). */
  hints: HintLevel;
  /** Ends the connection; `takenOver` marks the reason for the client. */
  close(code: number, reason: string): void;
}

export interface HubDeps {
  store: Store;
  config: Config;
  random?: () => number;
  log?: (msg: string, err?: unknown) => void;
  now?: () => number;
}

export class Hub {
  readonly matchmaker: Matchmaker;
  readonly bots: BotPool;
  #store: Store;
  #config: Config;
  #random: () => number;
  #log: (msg: string, err?: unknown) => void;
  #now: () => number;
  #clients = new Map<string, HubClient>();
  #rooms = new Map<string, Room>();
  #seatOf = new Map<string, { room: Room; seat: number }>();
  #stopped = false;

  constructor(deps: HubDeps) {
    this.#store = deps.store;
    this.#config = deps.config;
    this.#random = deps.random ?? Math.random;
    this.#log = deps.log ?? ((msg, err) => console.error(`[hub] ${msg}`, err ?? ''));
    this.#now = deps.now ?? Date.now;
    this.matchmaker = new Matchmaker(deps.config, this.#random);
    this.bots = new BotPool({
      store: deps.store,
      matchmaker: this.matchmaker,
      config: deps.config,
      startGame: (match, opts) => this.startGame(match, opts),
      random: this.#random,
      now: this.#now,
      log: (msg, err) => this.#log(`bots: ${msg}`, err),
    });
  }

  get rooms(): ReadonlyMap<string, Room> {
    return this.#rooms;
  }

  get clients(): ReadonlyMap<string, HubClient> {
    return this.#clients;
  }

  roomOf(userId: string): { room: Room; seat: number } | undefined {
    return this.#seatOf.get(userId);
  }

  /** A connection completed `hello`: takes over any older connection of the same user and sends `welcome`. */
  async attach(client: HubClient): Promise<void> {
    const id = client.user.id;
    const old = this.#clients.get(id);
    this.#clients.set(id, client);
    client.rating = await this.#store.getRating(id);
    if (this.#clients.get(id) !== client) return; // replaced while waiting
    const active = this.#seatOf.get(id);
    client.send({
      type: 'welcome',
      user: client.user,
      rating: client.rating,
      activeGame: active ? active.room.info(active.seat) : null,
      queued: this.matchmaker.formatOf(id),
    });
    if (active) active.room.attach(active.seat, client, client.hints);
    if (old && old !== client) {
      old.send({ type: 'takenOver' });
      old.close(4000, 'takenOver');
    }
  }

  /** A connection closed. */
  detach(client: HubClient): void {
    const id = client.user.id;
    const active = this.#seatOf.get(id);
    if (active) active.room.detach(client);
    if (this.#clients.get(id) !== client) return; // an older connection that was taken over
    this.#clients.delete(id);
    // Queue entries are kept: a reconnecting client resumes them via `welcome.queued`.
  }

  handle(client: HubClient, msg: ClientMessage): void {
    const id = client.user.id;
    const active = this.#seatOf.get(id);
    switch (msg.type) {
      case 'hello':
        return; // handled by the connection
      case 'ping':
        client.send({ type: 'pong' });
        return;
      case 'queue.join':
        if (active) {
          client.send({ type: 'error', code: 'inGame' });
          client.send({ type: 'game.start', game: active.room.info(active.seat) });
          active.room.resync(active.seat);
          return;
        }
        if (this.#stopped) return;
        this.matchmaker.join(
          { userId: id, name: client.user.name, rating: client.rating.rating, games: client.rating.games, joinedAt: this.#now() },
          msg.format,
        );
        client.send({ type: 'queue.status', format: msg.format, waitedMs: 0 });
        return;
      case 'queue.leave':
        this.matchmaker.leave(id);
        return;
      case 'act':
        if (!active) return client.send({ type: 'error', code: 'notInGame', requestSeq: msg.seq });
        if (active.room.id !== msg.gameId) return client.send({ type: 'error', code: 'wrongGame', requestSeq: msg.seq });
        active.room.act(active.seat, msg.seq, msg.action, client);
        return;
      case 'ready':
        if (active && active.room.id === msg.gameId) active.room.ready(active.seat);
        return;
      case 'resync': {
        if (active) return active.room.resync(active.seat);
        const format = this.matchmaker.formatOf(id);
        if (format) client.send({ type: 'queue.status', format, waitedMs: this.matchmaker.waitedMs(id, this.#now()) ?? 0 });
        return;
      }
      case 'hints':
        client.hints = msg.level;
        if (active) active.room.setHints(active.seat, msg.level);
        return;
    }
  }

  /** Matchmaking tick: starts games, moves bot players, reports waiting times. Call once a second. */
  async tick(): Promise<void> {
    if (this.#stopped) return;
    const now = this.#now();
    for (const m of this.matchmaker.tick(now)) {
      try {
        await this.startGame(m);
      } catch (e) {
        this.#log('failed to start a game', e);
      }
    }
    await this.bots.tick();
    for (const { entry, format } of this.matchmaker.queued()) {
      this.#clients.get(entry.userId)?.send({ type: 'queue.status', format, waitedMs: now - entry.joinedAt });
    }
  }

  async startGame(match: Match, opts: { fast?: boolean } = {}): Promise<Room> {
    const id = randomUUID();
    const seed = randomUUID();
    const rules = makeRules(DEFAULT_RULES, { length: match.format });
    await this.#store.createGame({ id, format: match.format, rules, seed, seats: match.seats });
    const room = this.#makeRoom({ id, format: match.format, rules, seed, seats: match.seats, fast: opts.fast });
    for (const [seat, s] of match.seats.entries()) {
      if (s.kind !== 'human') continue;
      const client = this.#clients.get(s.userId);
      if (client) {
        client.send({ type: 'game.start', game: room.info(seat) });
        room.attach(seat, client, client.hints, true);
      }
    }
    room.start();
    return room;
  }

  /** Rebuilds rooms for unfinished games from the store; humans start disconnected. */
  async recover(replay: (g: StoredGame) => Room['state']): Promise<number> {
    const games = await this.#store.loadRunningGames();
    let n = 0;
    for (const g of games) {
      try {
        const state = replay(g);
        const room = this.#makeRoom({ id: g.id, format: g.format, rules: g.rules, seed: g.seed, seats: g.seats, state });
        room.start();
        n++;
      } catch (e) {
        // Its log no longer replays (e.g. the wall generation changed): end it unrated instead of retrying forever.
        this.#log(`could not recover game ${g.id}; marking it aborted`, e);
        await this.#store.abortGame(g.id).catch((err) => this.#log(`could not abort game ${g.id}`, err));
      }
    }
    return n;
  }

  /** Stops matchmaking, tells clients to reconnect later and stops the rooms' timers. */
  shutdown(): void {
    this.#stopped = true;
    this.bots.stop();
    for (const c of this.#clients.values()) {
      c.send({ type: 'server.restarting' });
      c.close(1001, 'restarting');
    }
    for (const r of this.#rooms.values()) r.close();
  }

  #makeRoom(init: ConstructorParameters<typeof Room>[1]): Room {
    const room = new Room(
      {
        store: this.#store,
        config: this.#config,
        random: this.#random,
        log: this.#log,
        pace: () => this.bots.settings,
        timeoutPercent: () => this.bots.settings.timeoutPercent,
        onEnd: (r, ratings) => this.#onEnd(r, ratings),
      },
      init,
    );
    this.#rooms.set(room.id, room);
    for (const [seat, s] of init.seats.entries()) {
      if (s.kind === 'human') this.#seatOf.set(s.userId, { room, seat });
      else if (s.userId !== null) this.bots.seated(s.userId, room.id);
    }
    return room;
  }

  #onEnd(room: Room, ratings: RatingUpdate[]): void {
    this.#rooms.delete(room.id);
    for (const s of room.seats) {
      if (s.kind === 'human' && this.#seatOf.get(s.userId)?.room === room) this.#seatOf.delete(s.userId);
    }
    for (const r of ratings) {
      const c = this.#clients.get(r.userId);
      if (c) c.rating = { rating: r.rating, games: r.games };
    }
    this.bots.roomEnded(room, ratings);
  }
}

export type { GameInfo, ServerMessage };
