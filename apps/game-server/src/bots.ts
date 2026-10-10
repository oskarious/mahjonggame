// The bot players: a persistent population of accounts with a hidden skill whose ratings move like anyone's. The pool
// owns their live state (idle, queued for a human, busy in a room), summons them into the queue for waiting humans,
// and starts background games among idle bots so ratings and game counts keep moving. Each bot has a schedule
// (schedule.ts): it is online only in sessions that follow its local day, and only online bots are picked.
import { botElo, skillForElo } from '@mahjong/engine';
import {
  type AdminBot,
  type AdminCreateBots,
  type AdminPoolSnapshot,
  type BotSchedule,
  type Format,
  isValidUsername,
} from '@mahjong/protocol';
import type { Config } from './config.ts';
import { type Match, type Matchmaker, type QueueEntry, type SeatInit, shuffle } from './matchmaking.ts';
import { botName } from './names.ts';
import type { Room } from './room.ts';
import { onlineChance, randomSchedule, sessionLength, sessionStartChance } from './schedule.ts';
import { type BotSettings, mergeSettings, SETTINGS_KEY, settingsFromStored } from './settings.ts';
import type { BotPatch, BotRow, RatingUpdate, Store } from './store.ts';

export type BotState = 'idle' | 'queued' | 'busy';

export interface PoolBot extends BotRow {
  state: BotState;
  /** While queued: the human it joined for. */
  forUserId: string | null;
  /** While busy: the room (null while the room is being created). */
  roomId: string | null;
  /** Not picked again before this time (a short rest after each game). */
  restUntil: number;
  /** Humans from its last game; it is not summoned for them again right away if others fit. */
  lastOpponents: Set<string>;
  schedule: BotSchedule;
  /** End of its current online session (0 or past = offline). Only idle bots are held to it. */
  onlineUntil: number;
}

/** The admin view of the pool; the hub adds `live` (rooms and queue). */
export type PoolSnapshot = Omit<AdminPoolSnapshot, 'live'>;
type BotSummary = AdminBot;
export type CreateBotsRequest = AdminCreateBots;

export interface BotPoolDeps {
  store: Store;
  matchmaker: Matchmaker;
  config: Pick<Config, 'newGames' | 'botsBackground'>;
  /** Starts a game (the hub's startGame); `fast` = no delays (warm-up). */
  startGame: (match: Match, opts: { fast: boolean }) => Promise<Room>;
  random?: () => number;
  now?: () => number;
  log?: (msg: string, err?: unknown) => void;
}

interface Demand {
  joinedAt: number;
  /** No bot joins for this human before this time. */
  summonAt: number;
  /** The next bot joins at this time (null = not scheduled yet). */
  arrivalAt: number | null;
  /** A bot is being created for this human. */
  growing: boolean;
}

/** Most name collisions before a bot is given up on (names are random; collisions are rare). */
const NAME_ATTEMPTS = 30;
/** How often offline bots get a chance to start a session. */
const SESSION_CHECK_MS = 15_000;

export class BotPool {
  settings: BotSettings = settingsFromStored(null);
  #bots = new Map<string, PoolBot>();
  #demand = new Map<string, Demand>();
  #fastRooms = new Set<string>();
  #nextBackgroundAt = 0;
  #lastSessionsAt: number | null = null;
  #lastGrownAt: number | null = null;
  #stopped = false;
  #topUp: Promise<unknown> = Promise.resolve();
  #store: Store;
  #mm: Matchmaker;
  #config: BotPoolDeps['config'];
  #startGame: BotPoolDeps['startGame'];
  #random: () => number;
  #now: () => number;
  #log: (msg: string, err?: unknown) => void;

  constructor(deps: BotPoolDeps) {
    this.#store = deps.store;
    this.#mm = deps.matchmaker;
    this.#config = deps.config;
    this.#startGame = deps.startGame;
    this.#random = deps.random ?? Math.random;
    this.#now = deps.now ?? Date.now;
    this.#log = deps.log ?? ((msg, err) => console.error(`[bots] ${msg}`, err ?? ''));
  }

  get bots(): ReadonlyMap<string, PoolBot> {
    return this.#bots;
  }

  /**
   * Loads settings and every bot player from the store, giving bots without a schedule one (stored), and puts about as
   * many bots online as would be at this hour. Call before recovering rooms.
   */
  async load(): Promise<void> {
    this.settings = settingsFromStored(await this.#store.loadSetting(SETTINGS_KEY), (m) => this.#log(m));
    for (const row of await this.#store.loadBots()) {
      let schedule = row.schedule;
      if (!schedule) {
        schedule = randomSchedule(this.#random, this.settings);
        await this.#store.setBotSchedule(row.id, schedule);
      }
      this.#bots.set(row.id, this.#fresh({ ...row, schedule }));
    }
    this.#seedSessions();
  }

  /**
   * Creates active bots until the minimum is met, spread evenly over the bots' rating range. Returns how many. Calls
   * run one after another, so overlapping top-ups (startup, a settings change) never overshoot.
   */
  ensurePool(): Promise<number> {
    const run = this.#topUp.then(() => this.#fill());
    this.#topUp = run.catch(() => 0);
    return run;
  }

  async #fill(): Promise<number> {
    const missing = this.settings.botPoolMin - this.activeCount();
    if (missing <= 0) return 0;
    const lo = botElo(0);
    const hi = botElo(1);
    let created = 0;
    for (let i = 0; i < missing && !this.#stopped; i++) {
      const rating = lo + ((hi - lo) * (i + this.#random())) / missing;
      if (await this.#create(skillForElo(rating))) created++;
    }
    return created;
  }

  /** A room was created with these bots seated: they are busy until it ends. */
  seated(botId: string, roomId: string): void {
    const b = this.#bots.get(botId);
    if (!b) return;
    b.state = 'busy';
    b.roomId = roomId;
    b.forUserId = null;
  }

  /** A room finished: its bots take their new ratings, rest briefly and become idle. */
  roomEnded(room: Room, ratings: RatingUpdate[]): void {
    const now = this.#now();
    const fast = this.#fastRooms.delete(room.id);
    const humans = new Set(room.seats.flatMap((s) => (s.kind === 'human' ? [s.userId] : [])));
    for (const s of room.seats) {
      if (s.kind !== 'bot' || s.userId === null) continue;
      const b = this.#bots.get(s.userId);
      if (!b || b.roomId !== room.id) continue;
      const r = ratings.find((x) => x.userId === b.id);
      if (r) {
        b.rating = r.rating;
        b.games = r.games;
      }
      b.state = 'idle';
      b.roomId = null;
      b.restUntil = fast ? now : now + this.#between(this.settings.botRestMs);
      b.lastOpponents = humans;
    }
  }

  /** Withdraws bots whose human is gone, summons bots for waiting humans, starts background games. Once a second. */
  async tick(): Promise<void> {
    if (this.#stopped) return;
    const now = this.#now();
    this.#withdraw();
    this.#sessions(now);
    this.#summon(now);
    this.#background(now);
  }

  /** Stops summoning, growth and background games (shutdown). Running rooms are the hub's business. */
  stop(): void {
    this.#stopped = true;
  }

  /** While most bots are new, background games run without delays so ratings settle quickly. */
  get warmingUp(): boolean {
    let active = 0;
    let established = 0;
    for (const b of this.#bots.values()) {
      if (!b.active) continue;
      active++;
      if (b.games >= this.#config.newGames) established++;
    }
    return active > 0 && established < active / 2;
  }

  /** Active bots online now (by schedule, or in a game): the ones that may do things around the site. */
  onlineIds(): string[] {
    const now = this.#now();
    return [...this.#bots.values()]
      .filter((b) => b.active && (b.state !== 'idle' || this.#online(b, now)))
      .map((b) => b.id);
  }

  // ---------------------------------------------------------------------------
  // Admin

  snapshot(): PoolSnapshot {
    const now = this.#now();
    const counts = { active: 0, retired: 0, online: 0, offline: 0, idle: 0, resting: 0, queued: 0, busy: 0 };
    const bots: BotSummary[] = [];
    for (const b of this.#bots.values()) {
      let state: BotSummary['state'] = b.state;
      const online = b.state !== 'idle' || this.#online(b, now);
      if (b.state === 'idle' && !b.active) state = 'retired';
      else if (!online) state = 'offline';
      else if (b.state === 'idle' && b.restUntil > now) state = 'resting';
      if (b.active) {
        counts.active++;
        if (online) counts.online++;
      } else counts.retired++;
      if (state !== 'retired') counts[state]++;
      bots.push({
        id: b.id,
        name: b.name,
        skill: b.skill,
        active: b.active,
        rating: b.rating,
        games: b.games,
        state,
        roomId: b.roomId,
        forUserId: b.forUserId,
        schedule: structuredClone(b.schedule),
        online,
      });
    }
    return {
      settings: structuredClone(this.settings),
      backgroundAllowed: this.#config.botsBackground,
      warmingUp: this.warmingUp,
      counts,
      lastGrownAt: this.#lastGrownAt,
      bots,
    };
  }

  /** Creates bots for the admin: `count` spread over a rating range, or one with an optional name/skill. */
  async createBots(req: CreateBotsRequest): Promise<{ created: BotSummary[] } | { error: string }> {
    const out: PoolBot[] = [];
    const adding = 'count' in req ? req.count : 1;
    if (Number.isInteger(adding) && adding > 0 && this.activeCount() + adding > this.settings.botPoolMax) {
      return { error: this.#overMax() };
    }
    if ('count' in req) {
      const { count, minRating, maxRating } = req;
      if (!Number.isInteger(count) || count < 1 || count > 500)
        return { error: 'count must be an integer from 1 to 500' };
      if (![minRating, maxRating].every(Number.isFinite) || minRating > maxRating)
        return { error: 'Give a rating range, low to high' };
      for (let i = 0; i < count; i++) {
        const rating = minRating + ((maxRating - minRating) * (i + this.#random())) / count;
        const b = await this.#create(skillForElo(rating));
        if (b) out.push(b);
      }
    } else {
      const skill = req.skill ?? this.#random();
      if (typeof skill !== 'number' || !(skill >= 0 && skill <= 1)) return { error: 'skill must be from 0 to 1' };
      if (req.name !== undefined) {
        if (!isValidUsername(req.name)) return { error: 'Not a valid username' };
        const schedule = randomSchedule(this.#random, this.settings);
        const row = await this.#store.createBot({ name: req.name, skill, rating: Math.round(botElo(skill)), schedule });
        if (!row) return { error: 'That name is taken' };
        out.push(this.#add({ ...row, schedule }));
      } else {
        const b = await this.#create(skill);
        if (!b) return { error: 'Could not find a free name' };
        out.push(b);
      }
    }
    const summaries = new Map(this.snapshot().bots.map((b) => [b.id, b]));
    return { created: out.map((b) => summaries.get(b.id)!) };
  }

  /** Rename, change skill, retire or reactivate. A retired bot in a game finishes it first. */
  async updateBot(id: string, patch: BotPatch): Promise<{ ok: true } | { error: string }> {
    const b = this.#bots.get(id);
    if (!b) return { error: 'No such bot' };
    if (patch.name !== undefined && (typeof patch.name !== 'string' || !isValidUsername(patch.name))) {
      return { error: 'Not a valid username' };
    }
    if (patch.skill !== undefined && (typeof patch.skill !== 'number' || !(patch.skill >= 0 && patch.skill <= 1))) {
      return { error: 'skill must be from 0 to 1' };
    }
    if (patch.active !== undefined && typeof patch.active !== 'boolean')
      return { error: 'active must be true or false' };
    if (patch.active === true && !b.active && this.activeCount() >= this.settings.botPoolMax)
      return { error: this.#overMax() };
    const clean: BotPatch = {};
    if (patch.name !== undefined) clean.name = patch.name;
    if (patch.skill !== undefined) clean.skill = patch.skill;
    if (patch.active !== undefined) clean.active = patch.active;
    const r = await this.#store.updateBot(id, clean);
    if (r === 'nameTaken') return { error: 'That name is taken' };
    if (r === 'notFound') return { error: 'No such bot' };
    Object.assign(b, clean);
    if (clean.active === false && b.state === 'queued') {
      this.#mm.leave(b.id);
      this.#idle(b);
    }
    return { ok: true };
  }

  async updateSettings(patch: unknown): Promise<{ settings: BotSettings } | { error: string }> {
    const r = mergeSettings(this.settings, patch);
    if ('error' in r) return r;
    await this.#store.saveSetting(SETTINGS_KEY, r.settings);
    const old = this.settings;
    this.settings = r.settings;
    if (r.settings.backgroundEveryMs < old.backgroundEveryMs) this.#nextBackgroundAt = 0;
    if (r.settings.schedulesEnabled && !old.schedulesEnabled) this.#seedSessions();
    this.ensurePool().catch((e) => this.#log('could not grow the pool', e));
    return { settings: structuredClone(r.settings) };
  }

  // ---------------------------------------------------------------------------

  #fresh(row: BotRow & { schedule: BotSchedule }): PoolBot {
    return {
      ...row,
      state: 'idle',
      forUserId: null,
      roomId: null,
      restUntil: 0,
      lastOpponents: new Set(),
      onlineUntil: 0,
    };
  }

  #online(b: PoolBot, now: number): boolean {
    return !this.settings.schedulesEnabled || b.onlineUntil > now;
  }

  #startSession(b: PoolBot, now: number): void {
    b.onlineUntil = now + sessionLength(this.#random, this.settings.sessionMin);
  }

  /** Puts each bot online with the chance its schedule gives for now, part-way through a session (startup). */
  #seedSessions(): void {
    const now = this.#now();
    for (const b of this.#bots.values()) {
      if (b.active && this.#random() < onlineChance(b.schedule, now)) {
        b.onlineUntil = now + Math.round(this.#random() * sessionLength(this.#random, this.settings.sessionMin));
      }
    }
    this.#lastSessionsAt = now;
  }

  /**
   * Bots outside a session may start one, with the chance their schedule gives for the time since the last check (a
   * bot still finishing a game after its session ended may carry on into a new one).
   */
  #sessions(now: number): void {
    if (!this.settings.schedulesEnabled) return;
    const last = this.#lastSessionsAt ?? now - SESSION_CHECK_MS;
    if (now - last < SESSION_CHECK_MS) return;
    const dt = Math.min(now - last, 4 * SESSION_CHECK_MS);
    this.#lastSessionsAt = now;
    for (const b of this.#bots.values()) {
      if (!b.active || b.onlineUntil > now) continue;
      if (this.#random() < sessionStartChance(b.schedule, now, this.settings.sessionMin, dt))
        this.#startSession(b, now);
    }
  }

  #add(row: BotRow & { schedule: BotSchedule }): PoolBot {
    const b = this.#fresh(row);
    this.#bots.set(b.id, b);
    return b;
  }

  #idle(b: PoolBot): void {
    b.state = 'idle';
    b.forUserId = null;
    b.roomId = null;
  }

  #overMax(): string {
    return `That would be more than ${this.settings.botPoolMax} active bots (maximum pool)`;
  }

  /** Active bots: the ones the minimum and maximum pool size count. Retired bots are never counted. */
  /** Bot players not retired. */
  activeCount(): number {
    let n = 0;
    for (const b of this.#bots.values()) if (b.active) n++;
    return n;
  }

  #between([lo, hi]: [number, number]): number {
    return lo + Math.floor(this.#random() * (hi - lo));
  }

  /** A new active bot with a random free name; its starting rating is its skill's calibrated Elo. */
  async #create(skill: number): Promise<PoolBot | null> {
    for (let attempt = 0; attempt < NAME_ATTEMPTS; attempt++) {
      let name = botName(this.#random);
      if (attempt >= 5) name = `${name.slice(0, 16)}${Math.floor(this.#random() * 1000)}`;
      if (!isValidUsername(name)) continue;
      const schedule = randomSchedule(this.#random, this.settings);
      const row = await this.#store.createBot({ name, skill, rating: Math.round(botElo(skill)), schedule });
      if (row) return this.#add({ ...row, schedule });
    }
    this.#log(`gave up finding a free bot name after ${NAME_ATTEMPTS} attempts`);
    return null;
  }

  /** Idle, active, rested and online: may be summoned or seated. `anyHour` drops the online condition. */
  #available(now: number, anyHour = false): PoolBot[] {
    return [...this.#bots.values()].filter(
      (b) => b.active && b.state === 'idle' && b.restUntil <= now && (anyHour || this.#online(b, now)),
    );
  }

  /** Bot entries whose human left the queue (or was seated without them) go back to idle. */
  #withdraw(): void {
    for (const { entry } of [...this.#mm.queued()]) {
      if (entry.bot && !this.#mm.entry(entry.bot.forUserId)) {
        this.#mm.leave(entry.userId);
        const b = this.#bots.get(entry.userId);
        if (b) this.#idle(b);
      }
    }
    // Bots marked queued but no longer in the queue and never seated (e.g. a game failed to start).
    for (const b of this.#bots.values()) {
      if (b.state === 'queued' && !this.#mm.entry(b.id)) this.#idle(b);
    }
  }

  #summon(now: number): void {
    const s = this.settings;
    const seen = new Set<string>();
    for (const { entry, format } of [...this.#mm.queued()]) {
      if (entry.bot) continue;
      seen.add(entry.userId);
      let d = this.#demand.get(entry.userId);
      if (!d || d.joinedAt !== entry.joinedAt) {
        d = {
          joinedAt: entry.joinedAt,
          summonAt: entry.joinedAt + this.#between(s.summonAfterMs),
          arrivalAt: null,
          growing: false,
        };
        this.#demand.set(entry.userId, d);
      }
      if (now < d.summonAt) continue;
      if (this.#mm.groupFor(entry.userId, now).length >= 4) continue;
      if (d.arrivalAt === null) {
        d.arrivalAt = now + this.#between(s.botArrivalMs);
        continue;
      }
      if (now < d.arrivalAt) continue;
      const bot = this.#pickFor(entry, now) ?? this.#wakeFor(entry, now);
      if (bot) {
        this.#enqueue(bot, entry, format, now);
        d.arrivalAt = null;
      } else if (now - entry.joinedAt >= s.growAfterMs && !d.growing) {
        this.#grow(entry, format, d, now);
      }
    }
    for (const id of this.#demand.keys()) if (!seen.has(id)) this.#demand.delete(id);
  }

  /**
   * No online bot fits a waiting human: an offline one that fits logs on outside its usual hours (a session starts
   * now), so schedules never keep a human waiting and no bot is created while one fits.
   */
  #wakeFor(human: QueueEntry, now: number): PoolBot | null {
    const bot = this.#pickFor(human, now, true);
    if (bot) this.#startSession(bot, now);
    return bot;
  }

  /** Among fitting available bots (preferring ones that did not just play this human), one of the 3 closest. */
  #pickFor(human: QueueEntry, now: number, anyHour = false): PoolBot | null {
    const fitting = this.#available(now, anyHour).filter((b) => this.#mm.fits(human.userId, b.rating, now));
    if (!fitting.length) return null;
    const fresh = fitting.filter((b) => !b.lastOpponents.has(human.userId));
    const closest = (fresh.length ? fresh : fitting)
      .sort((a, b) => Math.abs(a.rating - human.rating) - Math.abs(b.rating - human.rating))
      .slice(0, 3);
    return closest[Math.floor(this.#random() * closest.length)];
  }

  #enqueue(bot: PoolBot, human: QueueEntry, format: Format, now: number): void {
    this.#mm.join(
      {
        userId: bot.id,
        name: bot.name,
        rating: bot.rating,
        games: bot.games,
        joinedAt: now,
        bot: { skill: bot.skill, forUserId: human.userId, windowFrom: human.joinedAt },
      },
      format,
    );
    bot.state = 'queued';
    bot.forUserId = human.userId;
  }

  /** Nobody fits this human: create a bot near their rating, or at the size limit send the nearest idle bot anyway. */
  #grow(human: QueueEntry, format: Format, d: Demand, now: number): void {
    if (this.activeCount() >= this.settings.botPoolMax) {
      const nearest = this.#available(now, true).sort(
        (a, b) => Math.abs(a.rating - human.rating) - Math.abs(b.rating - human.rating),
      )[0];
      if (nearest) {
        if (!this.#online(nearest, now)) this.#startSession(nearest, now);
        this.#enqueue(nearest, human, format, now);
        d.arrivalAt = null;
      }
      return;
    }
    d.growing = true;
    this.#lastGrownAt = now;
    this.#log(`no idle bot fits a player rated ${human.rating}; creating one`);
    this.#create(skillForElo(human.rating))
      .catch((e) => this.#log('could not create a bot', e))
      .finally(() => (d.growing = false));
  }

  #background(now: number): void {
    const s = this.settings;
    if (!this.#config.botsBackground || !s.backgroundEnabled || now < this.#nextBackgroundAt) return;
    const warm = this.warmingUp;
    this.#nextBackgroundAt = now + (warm ? s.warmupEveryMs : Math.round(s.backgroundEveryMs * (0.5 + this.#random())));
    if (warm && this.#fastRooms.size >= s.warmupTables) return;
    // Warm-up settles ratings and ignores schedules; normal background games seat (and keep a reserve of) online bots.
    const avail = this.#available(now, warm);
    if (avail.length < 4 || (!warm && avail.length - 4 < s.idleReserve)) return;
    const seed = avail[Math.floor(this.#random() * avail.length)];
    const peers = avail
      .filter((b) => b !== seed)
      .sort((a, b) => Math.abs(a.rating - seed.rating) - Math.abs(b.rating - seed.rating))
      .slice(0, 3);
    const table = [seed, ...peers];
    for (const b of table) {
      b.state = 'busy';
      b.roomId = null;
    }
    const seats: SeatInit[] = table.map((b) => ({
      kind: 'bot',
      skill: b.skill,
      userId: b.id,
      name: b.name,
      rating: b.rating,
      games: b.games,
    }));
    const format: Format = this.#random() < 0.5 ? 'east' : 'south';
    this.#startGame({ format, seats: shuffle(seats, this.#random) }, { fast: warm }).then(
      (room) => {
        if (warm && !room.finished) this.#fastRooms.add(room.id);
      },
      (e) => {
        this.#log('could not start a background game', e);
        for (const b of table) if (b.roomId === null) this.#idle(b);
      },
    );
  }
}
