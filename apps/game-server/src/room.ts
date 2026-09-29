// One running game. Every input (client action, timeout, bot move, ready, next hand) goes through one serialized
// queue: validate → persist → apply → schedule the next decisions → send each connected human their view.
// Seats are humans or bot players; games of four bot players (background games) run the same way.
import {
  type Action,
  type GameEvent,
  type GameState,
  type HintLevel,
  type RuleSet,
  type Seat,
  actionKey,
  applyAction,
  botAction,
  createGame,
  legalActions,
  pendingSeats,
  redactEvent,
  skillForElo,
  timeoutAction,
  viewFor,
} from '@mahjong/engine';
import type { ErrorCode, Format, GameInfo, RatingChange, ServerMessage } from '@mahjong/protocol';
import type { Config } from './config.ts';
import type { SeatInit } from './matchmaking.ts';
import { joinDelay, readyDelay, thinkDelay } from './pacing.ts';
import { clampHints, hintLevelForRating, ratingChanges } from './rating.ts';
import type { RatingUpdate, SeatResult, Store } from './store.ts';

/** What the room needs from a connection. */
export interface Client {
  send(msg: ServerMessage): void;
}

export interface HumanSeat {
  kind: 'human';
  userId: string;
  name: string;
  /** Rating and rated games at the start of the game. */
  rating: number;
  games: number;
  client: Client | null;
  /** Set while disconnected. */
  disconnectedAt: number | null;
  /** A bot plays this seat until the human reconnects. */
  botControlled: boolean;
  /** Time bank left this hand, ms. */
  bank: number;
  /** Most help this player's rating allows; `hints` is what they get (they may lower it). */
  maxHints: HintLevel;
  hints: HintLevel;
  /** Confirmed the hand result (between hands). */
  ready: boolean;
}

export interface BotSeat {
  kind: 'bot';
  skill: number;
  /** The bot player's account; null for the anonymous bots of games from before bot players (not rated). */
  userId: string | null;
  name: string;
  rating: number;
  games: number;
  /** Time bank left this hand, ms (bots dip into it like humans do). */
  bank: number;
  /** Confirmed the hand result (after a random delay, like a human). */
  ready: boolean;
}

export type RoomSeat = HumanSeat | BotSeat;

type Timer = ReturnType<typeof setTimeout>;

/** A pending decision (human deadline or scheduled bot move) for one seat. */
interface Pending {
  mode: 'human' | 'bot';
  /** Identifies the step the decision belongs to, so responses by others do not reset it. */
  key: string;
  startedAt: number;
  base: number;
  deadlineAt: number;
  timer: Timer;
}

export interface RoomInit {
  id: string;
  format: Format;
  rules: RuleSet;
  seed: string;
  seats: SeatInit[];
  /** Recovered state (already replayed). New games start from `createGame`. */
  state?: GameState;
  /** Play without delays from the start (warm-up games of bot players). */
  fast?: boolean;
}

export interface RoomDeps {
  store: Store;
  config: Config;
  onEnd: (room: Room, ratings: RatingUpdate[]) => void;
  random?: () => number;
  log?: (msg: string, err?: unknown) => void;
  /** Current multiplier for bot think times (a runtime setting). Default 1. */
  thinkScale?: () => number;
  /** Chance in percent that a bot player lets a decision time out in a game with humans (a runtime setting). Default 0. */
  timeoutPercent?: () => number;
}

type RoomConfig = Pick<
  Config,
  | 'turnMs'
  | 'callMs'
  | 'openingTurnMs'
  | 'startCountdownMs'
  | 'handCountdownMs'
  | 'joinMaxMs'
  | 'bankMs'
  | 'readyMs'
  | 'graceMs'
  | 'abandonMs'
  | 'hintThresholds'
  | 'k'
  | 'kNew'
  | 'newGames'
>;

/** The dealer's first decision of a hand: nobody has discarded yet (public). */
function isOpening(g: GameState): boolean {
  const s = g.hand.step;
  return s.type === 'turn' && s.seat === g.dealer && g.hand.players[g.dealer].discards.length === 0;
}

function decisionKey(g: GameState): string {
  const s = g.hand.step;
  switch (s.type) {
    case 'turn':
      return `turn:${s.seat}:${g.seq}`;
    case 'calls':
    case 'chankan':
      return `${s.type}:${s.seat}:${s.tile}`;
    default:
      return 'over';
  }
}

export class Room {
  readonly id: string;
  readonly format: Format;
  readonly rules: RuleSet;
  readonly seed: string;
  readonly seats: RoomSeat[];
  state: GameState;
  /** Events of the last transition (for the initial update these are the deal). */
  #initialEvents: GameEvent[];
  #store: Store;
  #config: RoomConfig;
  #onEnd: RoomDeps['onEnd'];
  #random: () => number;
  #log: (msg: string, err?: unknown) => void;
  #thinkScale: () => number;
  #timeoutPercent: () => number;
  #chain: Promise<void> = Promise.resolve();
  #pending = new Map<Seat, Pending>();
  /** Per seat: the view and bank last sent (see #sendUpdate). */
  #lastSent = new Map<Seat, string>();
  #graceTimers = new Map<Seat, Timer>();
  #readyTimer: Timer | null = null;
  /** Bot seats confirming the hand result. */
  #botReadyTimers: Timer[] = [];
  /** Countdown after a deal: until then nobody can act and no decision timer runs (Date.now based; 0 = none). */
  #holdUntil = 0;
  #holdTimer: Timer | null = null;
  /** A new game (not recovered): the first deal gets the joining phase and the start countdown. */
  #fresh: boolean;
  /** Before the start countdown: waiting for the bots to "connect" (humans are connected when matched). */
  #joining = false;
  #joinTimers: Timer[] = [];
  #abandonTimer: Timer | null = null;
  /** No human has been connected for the abandon period: bots finish the game without delays. */
  #fast = false;
  #started = false;
  #finished = false;
  #closed = false;

  constructor(deps: RoomDeps, init: RoomInit) {
    this.id = init.id;
    this.format = init.format;
    this.rules = init.rules;
    this.seed = init.seed;
    this.#store = deps.store;
    this.#config = deps.config;
    this.#onEnd = deps.onEnd;
    this.#random = deps.random ?? Math.random;
    this.#log = deps.log ?? ((msg, err) => console.error(`[room ${init.id}] ${msg}`, err ?? ''));
    this.#thinkScale = deps.thinkScale ?? (() => 1);
    this.#timeoutPercent = deps.timeoutPercent ?? (() => 0);
    this.#fast = init.fast ?? false;
    this.seats = init.seats.map((s) =>
      s.kind === 'bot'
        ? {
            kind: 'bot',
            skill: s.skill,
            userId: s.userId,
            name: s.name,
            rating: s.rating,
            games: s.games,
            bank: this.#config.bankMs,
            ready: false,
          }
        : {
            kind: 'human',
            userId: s.userId,
            name: s.name,
            rating: s.rating,
            games: s.games,
            client: null,
            disconnectedAt: null,
            botControlled: false,
            bank: this.#config.bankMs,
            maxHints: hintLevelForRating(s.rating, this.#config),
            hints: hintLevelForRating(s.rating, this.#config),
            ready: false,
          },
    );
    this.#fresh = !init.state;
    if (init.state) {
      this.state = init.state;
      this.#initialEvents = [];
    } else {
      const t = createGame(init.rules, init.seed);
      this.state = t.state;
      this.#initialEvents = t.events;
    }
  }

  get finished(): boolean {
    return this.#finished;
  }

  /** Whether any seat belongs to a human (false for background games of bot players). */
  get hasHumans(): boolean {
    return this.seats.some((s) => s.kind === 'human');
  }

  /** Seat of a user, or -1. */
  seatOf(userId: string): Seat {
    return this.seats.findIndex((s) => s.kind === 'human' && s.userId === userId);
  }

  humanAt(seat: Seat): HumanSeat {
    const s = this.seats[seat];
    if (!s || s.kind !== 'human') throw new Error(`Seat ${seat} is not a human`);
    return s;
  }

  info(seat: Seat): GameInfo {
    return {
      gameId: this.id,
      seat,
      format: this.format,
      // Bot players look exactly like humans here.
      players: this.seats.map((s, i) => ({ seat: i, name: s.name, rating: s.rating })),
    };
  }

  /** Schedules the first decisions and sends every attached client the opening view. Call once. */
  start(): void {
    if (this.#started) return;
    this.#started = true;
    for (const [i, s] of this.seats.entries()) {
      if (s.kind === 'human' && s.client === null) this.#startGrace(i);
    }
    this.#checkAbandoned();
    this.#run(async () => {
      if (this.#fresh) this.#startJoining();
      this.#schedule(null);
      this.#broadcast(this.#initialEvents);
      if (this.state.phase === 'gameOver') await this.#finish();
    });
  }

  /** Connects (or reconnects) the human at `seat`. Sends the current view unless `silent`. */
  attach(seat: Seat, client: Client, hints: HintLevel = 'full', silent = false): void {
    const h = this.humanAt(seat);
    h.client = client;
    h.disconnectedAt = null;
    h.botControlled = false;
    h.hints = clampHints(h.maxHints, hints);
    const grace = this.#graceTimers.get(seat);
    if (grace) clearTimeout(grace);
    this.#graceTimers.delete(seat);
    if (this.#abandonTimer) clearTimeout(this.#abandonTimer);
    this.#abandonTimer = null;
    if (!this.#started) return;
    this.#run(() => {
      this.#schedule(null);
      if (!silent) this.#sendUpdate(seat, []);
    });
  }

  /** The client went away: after the grace period a bot plays the seat. */
  detach(client: Client): void {
    const seat = this.seats.findIndex((s) => s.kind === 'human' && s.client === client);
    if (seat < 0) return;
    const h = this.humanAt(seat);
    h.client = null;
    h.disconnectedAt = Date.now();
    this.#startGrace(seat);
    this.#checkAbandoned();
  }

  act(seat: Seat, seq: number, action: Action, client: Client): void {
    this.#run(async () => {
      if (this.#closed || this.#finished) return;
      const g = this.state;
      if (this.#held()) {
        this.#error(client, 'illegal', seq);
        this.#sendUpdate(seat, []);
        return;
      }
      // Clients only know the public sequence number (see GameState.publicSeq).
      if (seq !== g.publicSeq) {
        this.#error(client, 'staleSeq', seq);
        this.#sendUpdate(seat, []);
        return;
      }
      if (action.type === 'nextHand' || action.seat !== seat) {
        this.#error(client, 'illegal', seq);
        return;
      }
      const key = actionKey(action);
      if (!legalActions(g, seat).some((a) => actionKey(a) === key)) {
        this.#error(client, 'illegal', seq);
        this.#sendUpdate(seat, []);
        return;
      }
      await this.#apply(action, seat);
    });
  }

  /** Between hands: the next hand starts when every connected human and every bot is ready (or the timer runs out). */
  ready(seat: Seat): void {
    this.#run(() => {
      if (this.state.phase !== 'handOver') return;
      this.humanAt(seat).ready = true;
      if (this.#allReady()) this.#nextHand();
    });
  }

  setHints(seat: Seat, level: HintLevel): void {
    const h = this.humanAt(seat);
    h.hints = clampHints(h.maxHints, level);
    this.#run(() => this.#sendUpdate(seat, []));
  }

  resync(seat: Seat): void {
    this.#run(() => this.#sendUpdate(seat, []));
  }

  /** Stops timers; the game stays in the database for recovery. */
  close(): void {
    this.#closed = true;
    for (const p of this.#pending.values()) clearTimeout(p.timer);
    this.#pending.clear();
    for (const t of this.#graceTimers.values()) clearTimeout(t);
    this.#graceTimers.clear();
    if (this.#readyTimer) clearTimeout(this.#readyTimer);
    if (this.#abandonTimer) clearTimeout(this.#abandonTimer);
    this.#readyTimer = this.#abandonTimer = null;
    this.#clearBotReady();
    this.#clearHold();
    this.#clearJoining();
  }

  /** Resolves once the queue is empty, including inputs queued by the ones it processed (tests). */
  async idle(): Promise<void> {
    let chain: Promise<void>;
    do {
      chain = this.#chain;
      await chain;
    } while (chain !== this.#chain);
  }

  // ---------------------------------------------------------------------------

  #run(fn: () => void | Promise<void>): Promise<void> {
    this.#chain = this.#chain.then(fn).catch((e) => this.#log('input failed', e));
    return this.#chain;
  }

  #error(client: Client, code: ErrorCode, requestSeq?: number): void {
    client.send({ type: 'error', code, requestSeq });
  }

  /** Persist, apply, reschedule, broadcast. Runs inside the queue. */
  async #apply(action: Action, actor: Seat | null): Promise<void> {
    const before = this.state;
    const t = applyAction(before, action);
    await this.#store.appendAction(this.id, before.seq, action);
    if (this.#closed) return;
    if (actor !== null) this.#chargeBank(actor);
    this.state = t.state;
    if (t.events.some((e) => e.type === 'handStart')) {
      for (const s of this.seats) {
        s.bank = this.#config.bankMs;
        s.ready = false;
      }
      this.#startHold(this.#config.handCountdownMs);
    }
    this.#schedule(actor);
    this.#broadcast(t.events);
    if (this.state.phase === 'gameOver') await this.#finish();
  }

  /** Time used beyond the base time comes out of the bank. */
  #chargeBank(seat: Seat): void {
    const p = this.#pending.get(seat);
    const s = this.seats[seat];
    if (!p || p.mode !== 'human' || s.kind !== 'human') return;
    const over = Date.now() - p.startedAt - p.base;
    if (over > 0) s.bank = Math.max(0, s.bank - over);
  }

  /** Makes the timers match the state: a deadline for every pending human, a delayed move for every bot. */
  #schedule(actor: Seat | null): void {
    if (this.#closed) return;
    const g = this.state;
    const pending = new Set(pendingSeats(g));
    const key = decisionKey(g);
    for (const [seat, p] of this.#pending) {
      const wanted = this.#botPlays(seat) ? 'bot' : 'human';
      if (!pending.has(seat) || seat === actor || p.key !== key || p.mode !== wanted) {
        clearTimeout(p.timer);
        this.#pending.delete(seat);
      }
    }
    if (g.phase === 'handOver') {
      if (!this.#readyTimer) {
        this.#readyTimer = setTimeout(() => this.#nextHand(), this.#fast ? 0 : this.#config.readyMs);
        this.#armBotReady();
        // Nobody to wait for (every human disconnected, no bots).
        if (this.#allReady()) this.#nextHand();
      }
      return;
    }
    if (g.phase !== 'playing' || this.#held()) return;
    const now = Date.now();
    for (const seat of pending) {
      if (this.#pending.has(seat)) continue;
      if (this.#botPlays(seat) && !this.#fast && this.#botTimesOut(seat)) {
        // Like a distracted human: the full time runs out and the automatic move is played.
        const base = this.#baseMs(g);
        const total = base + this.seats[seat].bank;
        const timer = setTimeout(() => this.#timeout(seat, key), total);
        this.#pending.set(seat, { mode: 'bot', key, startedAt: now, base, deadlineAt: now + total, timer });
      } else if (this.#botPlays(seat)) {
        const delay = this.#fast ? 0 : this.#think(seat);
        const timer = setTimeout(() => this.#botMove(seat, key), delay);
        this.#pending.set(seat, { mode: 'bot', key, startedAt: now, base: delay, deadlineAt: now + delay, timer });
      } else {
        const base = this.#baseMs(g);
        const total = base + this.humanAt(seat).bank;
        const timer = setTimeout(() => this.#timeout(seat, key), total);
        this.#pending.set(seat, { mode: 'human', key, startedAt: now, base, deadlineAt: now + total, timer });
      }
    }
  }

  /** Whether a bot player lets this decision time out: only in games with humans, where it has to look human. */
  #botTimesOut(seat: Seat): boolean {
    const s = this.seats[seat];
    const pct = this.#timeoutPercent();
    if (pct <= 0 || s.kind !== 'bot' || s.userId === null || !this.hasHumans) return false;
    return this.#random() > 1 - pct / 100;
  }

  /** A human-like delay for the bot deciding at `seat`; time beyond the base comes out of the seat's bank. */
  #think(seat: Seat): number {
    const g = this.state;
    const s = this.seats[seat];
    const base = this.#baseMs(g);
    const delay = thinkDelay(g, seat, { base, bank: s.bank, scale: this.#thinkScale(), opening: isOpening(g) }, this.#random);
    s.bank = Math.max(0, s.bank - Math.max(0, delay - base));
    return delay;
  }

  /** Base time of the current decision: longer for the dealer's opening, so everyone can look at their hand. */
  #baseMs(g: GameState): number {
    if (g.hand.step.type !== 'turn') return this.#config.callMs;
    return isOpening(g) ? this.#config.openingTurnMs : this.#config.turnMs;
  }

  #held(): boolean {
    return this.#joining || Date.now() < this.#holdUntil;
  }

  /**
   * A new game waits for every seat to join before the start countdown: connected humans have (they were matched from
   * the queue), each bot joins after its own random delay, so the countdown doesn't always start at the human's arrival.
   */
  #startJoining(): void {
    const bots = new Set(this.seats.flatMap((s, i) => (s.kind === 'bot' ? [i] : [])));
    if (this.#fast || this.#config.joinMaxMs <= 0 || !bots.size) {
      this.#startHold(this.#config.startCountdownMs);
      return;
    }
    this.#joining = true;
    this.#joinTimers.push(setTimeout(() => this.#run(() => this.#endJoining()), this.#config.joinMaxMs));
    for (const seat of bots) {
      const delay = joinDelay(this.#random, { maxMs: this.#config.joinMaxMs, scale: this.#thinkScale() });
      this.#joinTimers.push(
        setTimeout(() => {
          this.#run(() => {
            bots.delete(seat);
            if (!bots.size) this.#endJoining();
          });
        }, delay),
      );
    }
  }

  /** Everyone is here (or the wait is over): the start countdown begins. Sent to everyone, though views are unchanged. */
  #endJoining(): void {
    if (!this.#joining || this.#closed || this.#finished) return;
    this.#clearJoining();
    this.#startHold(this.#config.startCountdownMs);
    this.#schedule(null);
    for (let seat = 0; seat < 4; seat++) this.#sendUpdate(seat, []);
  }

  #clearJoining(): void {
    for (const t of this.#joinTimers) clearTimeout(t);
    this.#joinTimers = [];
    this.#joining = false;
  }

  /** Starts the countdown after a deal (not in fast rooms). When it ends, decisions are scheduled and shown. */
  #startHold(ms: number): void {
    this.#clearHold();
    if (this.#fast || ms <= 0) return;
    this.#holdUntil = Date.now() + ms;
    this.#holdTimer = setTimeout(() => {
      this.#holdTimer = null;
      this.#run(() => {
        if (this.#closed || this.#finished) return;
        this.#schedule(null);
        this.#broadcast([]);
      });
    }, ms);
  }

  #clearHold(): void {
    if (this.#holdTimer) clearTimeout(this.#holdTimer);
    this.#holdTimer = null;
    this.#holdUntil = 0;
  }

  /** Each bot confirms the hand result after its own random delay, so the deal doesn't always follow a human's click. */
  #armBotReady(): void {
    this.#clearBotReady();
    for (const s of this.seats) {
      if (s.kind !== 'bot') continue;
      const delay = this.#fast ? 0 : readyDelay(this.#random, { readyMs: this.#config.readyMs, scale: this.#thinkScale() });
      this.#botReadyTimers.push(
        setTimeout(() => {
          this.#run(() => {
            if (this.#closed || this.#finished || this.state.phase !== 'handOver') return;
            s.ready = true;
            if (this.#allReady()) this.#nextHand();
          });
        }, delay),
      );
    }
  }

  #clearBotReady(): void {
    for (const t of this.#botReadyTimers) clearTimeout(t);
    this.#botReadyTimers = [];
  }

  #botPlays(seat: Seat): boolean {
    const s = this.seats[seat];
    return s.kind === 'bot' || s.botControlled;
  }

  #botMove(seat: Seat, key: string): void {
    this.#run(async () => {
      if (this.#closed || this.#finished) return;
      if (decisionKey(this.state) !== key || !pendingSeats(this.state).includes(seat)) return;
      const s = this.seats[seat];
      const skill = s.kind === 'bot' ? s.skill : skillForElo(s.rating);
      const a = botAction(this.state, seat, { skill, random: this.#random });
      if (a) await this.#apply(a, seat);
    });
  }

  #timeout(seat: Seat, key: string): void {
    this.#run(async () => {
      if (this.#closed || this.#finished) return;
      if (decisionKey(this.state) !== key || !pendingSeats(this.state).includes(seat)) return;
      const s = this.seats[seat];
      s.bank = 0;
      const a = timeoutAction(this.state, seat);
      if (a) await this.#apply(a, seat);
    });
  }

  #nextHand(): void {
    this.#run(async () => {
      if (this.#readyTimer) clearTimeout(this.#readyTimer);
      this.#readyTimer = null;
      this.#clearBotReady();
      if (this.#closed || this.#finished || this.state.phase !== 'handOver') return;
      await this.#apply({ type: 'nextHand' }, null);
    });
  }

  #allReady(): boolean {
    return this.seats.every((s) => s.ready || (s.kind === 'human' && s.client === null));
  }

  #anyConnected(): boolean {
    return this.seats.some((s) => s.kind === 'human' && s.client !== null);
  }

  #startGrace(seat: Seat): void {
    const existing = this.#graceTimers.get(seat);
    if (existing) clearTimeout(existing);
    this.#graceTimers.set(
      seat,
      setTimeout(() => {
        this.#graceTimers.delete(seat);
        const h = this.humanAt(seat);
        if (h.client !== null) return;
        h.botControlled = true;
        this.#run(() => this.#schedule(null));
      }, this.#config.graceMs),
    );
  }

  /** With nobody connected, bots finish the game after the abandon period. */
  #checkAbandoned(): void {
    // Background games of bot players have nobody to wait for; they play at their normal pace.
    if (!this.hasHumans || this.#anyConnected() || this.#abandonTimer || this.#fast) return;
    this.#abandonTimer = setTimeout(() => {
      this.#abandonTimer = null;
      if (this.#anyConnected()) return;
      this.#fast = true;
      for (const [i, s] of this.seats.entries()) {
        if (s.kind === 'human' && s.client === null) {
          s.botControlled = true;
          const t = this.#graceTimers.get(i);
          if (t) clearTimeout(t);
          this.#graceTimers.delete(i);
        }
      }
      if (this.#readyTimer) {
        clearTimeout(this.#readyTimer);
        this.#readyTimer = null;
      }
      this.#clearBotReady();
      this.#clearHold();
      this.#clearJoining();
      this.#run(() => {
        // Existing bot timers keep their delay; new ones are immediate.
        for (const p of this.#pending.values()) clearTimeout(p.timer);
        this.#pending.clear();
        this.#schedule(null);
      });
    }, this.#config.abandonMs);
  }

  /**
   * Sends `seat` its view and the events. Unless `force`, nothing is sent when the seat gets no events and its view
   * and bank are unchanged: the message alone would tell it that someone acted (e.g. a hidden call response).
   */
  #sendUpdate(seat: Seat, events: GameEvent[], force = true): void {
    const s = this.seats[seat];
    if (s.kind !== 'human' || !s.client) return;
    const full = viewFor(this.state, seat, { hints: s.hints });
    // During a countdown nobody can act: the view carries no actions.
    const held = this.#held();
    const view = held ? { ...full, actions: [] } : full;
    const sent = JSON.stringify([view, s.bank]);
    if (!force && !events.length && this.#lastSent.get(seat) === sent) return;
    this.#lastSent.set(seat, sent);
    const p = this.#pending.get(seat);
    const msg: Extract<ServerMessage, { type: 'update' }> = {
      type: 'update',
      gameId: this.id,
      seq: this.state.publicSeq,
      view,
      events: events.map((e) => redactEvent(e, seat)),
      bank: s.bank,
    };
    if (p && p.mode === 'human') msg.deadline = Math.max(0, p.deadlineAt - Date.now());
    if (held && !this.#joining) msg.countdown = this.#holdUntil - Date.now();
    s.client.send(msg);
  }

  #broadcast(events: GameEvent[]): void {
    for (let seat = 0; seat < 4; seat++) this.#sendUpdate(seat, events, false);
  }

  async #finish(): Promise<void> {
    if (this.#finished) return;
    this.#finished = true;
    const final = this.state.final!;
    const bySeat = new Map(final.map((f) => [f.seat, f]));
    const deltas = ratingChanges(
      this.seats.map((s, i) => ({ rating: s.rating, games: s.games, fixed: s.userId === null, points: bySeat.get(i)!.points })),
      this.#config,
    );
    const changes: RatingChange[] = [];
    const ratings: RatingUpdate[] = [];
    const results: SeatResult[] = this.seats.map((s, i) => {
      const f = bySeat.get(i)!;
      let ratingAfter: number | null = null;
      if (s.userId !== null) {
        ratingAfter = s.rating + deltas[i];
        changes.push({ seat: i, before: s.rating, after: ratingAfter });
        ratings.push({ userId: s.userId, rating: ratingAfter, games: s.games + 1 });
      }
      return { seat: i, placement: f.rank, points: f.points, ratingAfter };
    });
    this.close();
    await this.#store.finishGame(this.id, final, results, ratings);
    for (const s of this.seats) {
      if (s.kind === 'human' && s.client) s.client.send({ type: 'game.end', gameId: this.id, final, ratings: changes });
    }
    this.#onEnd(this, ratings);
  }
}
