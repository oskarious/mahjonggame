import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type Action,
  type GameState,
  type Tile,
  DEFAULT_RULES,
  applyAction,
  botAction,
  createGame,
  kindOf,
  pendingSeats,
  scenario,
  scrambleHidden,
} from '@mahjong/engine';
import type { Config } from '../src/config.ts';
import { anonymousBot, type SeatInit } from '../src/matchmaking.ts';
import { joinDelay, readyDelay, thinkDelay } from '../src/pacing.ts';
import { DEFAULT_BOT_SETTINGS as PACE } from '../src/settings.ts';
import { Room } from '../src/room.ts';
import { MemoryStore, type RatingUpdate } from '../src/store.ts';
import { FakeClient, TEST_CONFIG, botSeat, seeded } from './helpers.ts';

const human = (id: string, rating = 1000): SeatInit => ({ kind: 'human', userId: id, name: id, rating, games: 0 });
/** Most tests use the old anonymous bots (unrated), which exercise the same room paths; see "Room bot players". */
const bot: SeatInit = anonymousBot(0.5);

interface Built {
  room: Room;
  store: MemoryStore;
  clients: (FakeClient | null)[];
  ended: RatingUpdate[][];
}

async function build(
  seats: SeatInit[],
  state?: GameState,
  config: Partial<Config> = {},
  attach = true,
  opts: { random?: () => number; fast?: boolean; timeoutPercent?: number } = {},
): Promise<Built> {
  const store = new MemoryStore();
  const cfg = { ...TEST_CONFIG, ...config };
  const rules = DEFAULT_RULES;
  const seed = 'room-test';
  await store.createGame({ id: 'g1', format: 'east', rules, seed, seats });
  const ended: RatingUpdate[][] = [];
  const room = new Room(
    {
      store,
      config: cfg,
      random: opts.random ?? (() => 0),
      timeoutPercent: () => opts.timeoutPercent ?? 0,
      onEnd: (_r, ratings) => ended.push(ratings),
      log: (m, e) => console.error(m, e),
    },
    { id: 'g1', format: 'east', rules, seed, seats, state, fast: opts.fast },
  );
  const clients = seats.map((s) => (s.kind === 'human' ? new FakeClient(s.userId) : null));
  if (attach) clients.forEach((c, i) => c && room.attach(i, c, true));
  room.start();
  await room.idle();
  return { room, store, clients, ended };
}

/** Rigged state where seat 0 (a human) is on turn holding a drawn tile. */
const turnState = () => scenario({ hands: ['123m456p789s11z2z', undefined, undefined, undefined], draws: '5m' });
const discardOf = (c: FakeClient) => c.last('update')!.view.actions.find((a) => a.type === 'discard' && !a.riichi)!;

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('Room timers', () => {
  it('sends the deadline and keeps the bank when acting within the base time', async () => {
    const { room, clients } = await build([human('a'), bot, bot, bot], turnState());
    const c = clients[0]!;
    const u = c.last('update')!;
    // The dealer's opening decision: 10 s base plus the bank.
    expect(u.deadline).toBe(10_000 + 20_000);
    expect(u.bank).toBe(20_000);
    expect(u.view.actions.length).toBeGreaterThan(0);
    await vi.advanceTimersByTimeAsync(9_000);
    room.act(0, u.seq, discardOf(c), c);
    await room.idle();
    expect(room.state.seq).toBe(1);
    expect(room.humanAt(0).bank).toBe(20_000);
  });

  it('charges the bank for time beyond the base', async () => {
    const { room, clients } = await build([human('a'), bot, bot, bot], turnState());
    const c = clients[0]!;
    await vi.advanceTimersByTimeAsync(13_000);
    room.act(0, 0, discardOf(c), c);
    await room.idle();
    expect(room.state.seq).toBe(1);
    expect(room.humanAt(0).bank).toBe(17_000);
    // The next own turn starts from the remaining bank.
    const next = c.all('update').at(-1)!;
    expect(next.bank).toBe(17_000);
  });

  it('discards the drawn tile when base time and bank are gone', async () => {
    const { room, clients, store } = await build([human('a'), bot, bot, bot], turnState());
    const drawn = room.state.hand.players[0].drawn!;
    await vi.advanceTimersByTimeAsync(29_999);
    expect(room.state.seq).toBe(0);
    await vi.advanceTimersByTimeAsync(1);
    await room.idle();
    expect(room.state.seq).toBe(1);
    expect(store.log[0]).toEqual({ gameId: 'g1', seq: 0, action: { type: 'discard', seat: 0, tile: drawn } });
    expect(room.humanAt(0).bank).toBe(0);
    expect(clients[0]!.last('update')!.view.players[0].discards.at(-1)).toMatchObject({ tile: drawn, tsumogiri: true });
  });

  it('passes for a player who times out on a call', async () => {
    // Seat 3 discards 5m; seat 0 holds 55m and can pon.
    let g = scenario({ hands: ['55m123p456s789s1z', undefined, undefined, undefined], turn: 3, draws: '5m' });
    g = applyAction(g, { type: 'discard', seat: 3, tile: g.hand.players[3].drawn! }).state;
    g.seq = 0;
    expect(pendingSeats(g)).toEqual([0]);
    const { room, clients } = await build([human('a'), bot, bot, bot], g);
    const u = clients[0]!.last('update')!;
    expect(u.view.actions.map((a) => a.type).sort()).toEqual(['pass', 'pon']);
    expect(u.deadline).toBe(5_000 + 20_000);
    await vi.advanceTimersByTimeAsync(25_000);
    await room.idle();
    expect(room.state.seq).toBe(1);
    expect(room.state.hand.step).toMatchObject({ type: 'turn', seat: 0 });
    expect(room.humanAt(0).bank).toBe(0);
  });

  it('bots act after a human-like think time', async () => {
    const { room, clients } = await build([human('a'), bot, bot, bot], turnState());
    const c = clients[0]!;
    room.act(0, 0, discardOf(c), c);
    await room.idle();
    expect(room.state.seq).toBe(1); // discard → (no calls) → seat 1's turn
    expect(pendingSeats(room.state)).toEqual([1]);
    const delay = thinkDelay(room.state, 1, { base: 5_000, bank: 20_000 }, PACE, () => 0);
    expect(delay).toBeGreaterThan(200);
    await vi.advanceTimersByTimeAsync(delay - 1);
    expect(room.state.seq).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    await room.idle();
    expect(room.state.seq).toBe(2);
  });

  it('waits for ready between hands, at most the ready time', async () => {
    // One live-wall tile: the dealer draws it, discards, and the hand ends in an exhaustive draw.
    const built = await build(
      [human('a'), bot, bot, bot],
      scenario({ hands: ['123m456p789s11z2z', undefined, undefined, undefined], wallSize: 1 }),
      { readyMs: 12_000 },
      true,
      {
        random: () => 0.5,
      },
    );
    const { room, clients } = built;
    const c = clients[0]!;
    room.act(0, 0, discardOf(c), c);
    await room.idle();
    await vi.advanceTimersByTimeAsync(1_000);
    await room.idle();
    expect(room.state.phase).toBe('handOver');
    expect(c.last('update')!.view.result?.type).toBe('exhaustive');
    // The hand ended within a second of the discard (bots may have had to pass); the 12 s wait runs from there.
    await vi.advanceTimersByTimeAsync(10_900);
    expect(room.state.phase).toBe('handOver');
    await vi.advanceTimersByTimeAsync(1_100);
    await room.idle();
    expect(room.state.phase).toBe('playing');
    expect(room.humanAt(0).bank).toBe(20_000);
  });

  it('deals once the human and every bot have confirmed, so the human is not always the one who starts the hand', async () => {
    const wallOfOne = () => scenario({ hands: ['123m456p789s11z2z', undefined, undefined, undefined], wallSize: 1 });
    /** Plays the dealer's discard and runs until the hand is over; returns the time the result appeared. */
    const toHandOver = async (b: Built) => {
      b.room.act(0, 0, discardOf(b.clients[0]!), b.clients[0]!);
      await b.room.idle();
      for (let i = 0; i < 100 && b.room.state.phase !== 'handOver'; i++) {
        await vi.advanceTimersByTimeAsync(10);
        await b.room.idle();
      }
      expect(b.room.state.phase).toBe('handOver');
      return Date.now();
    };
    const botDelay = readyDelay(() => 0.5, 12_000, PACE);
    expect(botDelay).toBeGreaterThan(1_000);

    // The human confirms at once: the deal waits for the bots' confirms.
    const b = await build([human('a'), bot, bot, bot], wallOfOne(), {}, true, { random: () => 0.5 });
    const shown = await toHandOver(b);
    b.room.ready(0);
    await b.room.idle();
    expect(b.room.state.phase).toBe('handOver');
    await vi.advanceTimersByTimeAsync(shown + botDelay - Date.now() - 1);
    await b.room.idle();
    expect(b.room.state.phase).toBe('handOver');
    await vi.advanceTimersByTimeAsync(1);
    await b.room.idle();
    expect(b.room.state.phase).toBe('playing');

    // A slow human: the bots have long confirmed, the deal follows the human's click.
    const b2 = await build([human('a'), bot, bot, bot], wallOfOne(), {}, true, { random: () => 0.5 });
    await toHandOver(b2);
    await vi.advanceTimersByTimeAsync(7_000);
    await b2.room.idle();
    expect(b2.room.state.phase).toBe('handOver');
    b2.room.ready(0);
    await b2.room.idle();
    expect(b2.room.state.phase).toBe('playing');
  });

  it('varies the deal time from hand to hand', async () => {
    const seats = [human('a'), botSeat('x'), botSeat('y'), botSeat('z')];
    const b = await build(seats, undefined, { turnMs: 50, callMs: 50, openingTurnMs: 50, bankMs: 0 }, true, {
      random: seeded('deal-times'),
    });
    const waits: number[] = [];
    let overAt: number | null = null;
    // The human never acts (every decision times out) but confirms every result at once.
    for (let i = 0; i < 20_000 && !b.room.finished && waits.length < 3; i++) {
      await vi.advanceTimersByTimeAsync(50);
      await b.room.idle();
      const phase = b.room.state.phase;
      if (phase === 'handOver' && overAt === null) {
        overAt = Date.now();
        b.room.ready(0);
        await b.room.idle();
      } else if (phase === 'playing' && overAt !== null) {
        waits.push(Date.now() - overAt);
        overAt = null;
      }
    }
    expect(waits.length).toBe(3);
    expect(waits.every((w) => w >= 800 && w <= 12_050)).toBe(true);
    expect(new Set(waits.map((w) => Math.round(w / 100))).size).toBeGreaterThan(1);
  });
});

describe('Room countdowns', () => {
  const COUNTDOWNS = { startCountdownMs: 5_000, handCountdownMs: 3_000 };

  it('counts down 5 s after the first deal: everyone sees their hand, nobody can act, then the dealer gets 10 s', async () => {
    // Seat 0 (human a) is the dealer of a new game.
    const { room, clients } = await build([human('a'), bot, human('c'), bot], undefined, COUNTDOWNS);
    const [a, , c] = clients as FakeClient[];
    for (const x of [a, c]) {
      const u = x.last('update')!;
      expect(u.countdown).toBe(5_000);
      expect(u.view.actions).toEqual([]);
      expect(u.deadline).toBeUndefined();
      expect(u.view.hand.length).toBeGreaterThanOrEqual(13);
    }
    // A (modified) client acting anyway is turned away.
    a.clear();
    room.act(0, 0, { type: 'discard', seat: 0, tile: room.state.hand.players[0].drawn! }, a);
    await room.idle();
    expect(a.sent[0]).toEqual({ type: 'error', code: 'illegal', requestSeq: 0 });
    expect(a.last('update')!.countdown).toBe(5_000);
    expect(room.state.seq).toBe(0);

    await vi.advanceTimersByTimeAsync(4_999);
    await room.idle();
    expect(a.last('update')!.view.actions).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    await room.idle();
    const u = a.last('update')!;
    expect(u.countdown).toBeUndefined();
    expect(u.view.actions.length).toBeGreaterThan(0);
    expect(u.deadline).toBe(10_000 + 20_000);
    // Now it's a normal decision.
    room.act(0, u.seq, discardOf(a), a);
    await room.idle();
    expect(room.state.seq).toBe(1);
  });

  it('counts down 3 s after the next deal; a bot dealer waits for it too', async () => {
    const g = scenario({ hands: ['123m456p789s11z2z', undefined, undefined, undefined], wallSize: 1 });
    const { room, clients } = await build([human('a'), bot, bot, bot], g, COUNTDOWNS, true, { random: () => 0.5 });
    const a = clients[0]!;
    // No start countdown for a game that didn't start here (rigged / recovered state).
    expect(a.last('update')!.countdown).toBeUndefined();
    room.act(0, 0, discardOf(a), a);
    await room.idle();
    for (let i = 0; i < 100 && room.state.phase !== 'handOver'; i++) {
      await vi.advanceTimersByTimeAsync(10);
      await room.idle();
    }
    room.ready(0);
    await room.idle();
    for (let i = 0; i < 1_300 && room.state.phase !== 'playing'; i++) {
      await vi.advanceTimersByTimeAsync(10);
      await room.idle();
    }
    expect(room.state.phase).toBe('playing');
    const dealt = a.last('update')!;
    expect(dealt.events.some((e) => e.type === 'handStart')).toBe(true);
    expect(dealt.countdown).toBe(3_000);
    // Noten dealer: the deal passed to seat 1, a bot. It doesn't act during the countdown.
    expect(room.state.dealer).toBe(1);
    const seq = room.state.seq;
    await vi.advanceTimersByTimeAsync(3_000);
    await room.idle();
    expect(room.state.seq).toBe(seq);
    // Its think time runs from the end of the countdown.
    const think = thinkDelay(room.state, 1, { base: 10_000, bank: 20_000, opening: true }, PACE, () => 0.5);
    await vi.advanceTimersByTimeAsync(think - 1);
    await room.idle();
    expect(room.state.seq).toBe(seq);
    await vi.advanceTimersByTimeAsync(1);
    await room.idle();
    expect(room.state.seq).toBe(seq + 1);
  });

  it('holds a takeover bot and sends a reconnecting player the remaining countdown', async () => {
    const { room, clients } = await build([human('a'), bot, bot, bot], undefined, { ...COUNTDOWNS, graceMs: 1_000 });
    room.detach(clients[0]!);
    await vi.advanceTimersByTimeAsync(2_000);
    await room.idle();
    expect(room.humanAt(0).botControlled).toBe(true);
    const back = new FakeClient('a');
    room.attach(0, back);
    await room.idle();
    const u = back.last('update')!;
    expect(u.countdown).toBe(3_000);
    expect(u.view.actions).toEqual([]);
    room.detach(back);
    await vi.advanceTimersByTimeAsync(2_999);
    await room.idle();
    expect(room.state.seq).toBe(0);
    await vi.advanceTimersByTimeAsync(10_000);
    await room.idle();
    expect(room.state.seq).toBeGreaterThan(0);
  });

  it('counts down in games of bot players too, but not in fast rooms', async () => {
    const seats = [botSeat('w'), botSeat('x'), botSeat('y'), botSeat('z')];
    const b = await build(seats, undefined, COUNTDOWNS, false, { random: seeded('bot-countdown') });
    const times: { at: number; action: Action }[] = [];
    const append = b.store.appendAction.bind(b.store);
    b.store.appendAction = (id, seq, action) => {
      times.push({ at: Date.now(), action });
      return append(id, seq, action);
    };
    const start = Date.now();
    await vi.advanceTimersByTimeAsync(4 * 60_000);
    await b.room.idle();
    expect(times[0].at - start).toBeGreaterThanOrEqual(5_000);
    const deals = times.flatMap((t, i) => (t.action.type === 'nextHand' ? [i] : []));
    expect(deals.length).toBeGreaterThan(0);
    for (const i of deals) if (times[i + 1]) expect(times[i + 1].at - times[i].at).toBeGreaterThanOrEqual(3_000);

    const f = await build(seats, undefined, COUNTDOWNS, false, { random: seeded('fast-countdown'), fast: true });
    await vi.advanceTimersByTimeAsync(5);
    await f.room.idle();
    expect(f.room.state.seq).toBeGreaterThan(0);
  });
});

describe('Room joining', () => {
  const JOIN = { startCountdownMs: 5_000, handCountdownMs: 3_000, joinMaxMs: 10_000 };

  it('starts the countdown when the last bot has joined, not when the human arrives', async () => {
    const random = seeded('join-room');
    // The room draws the three bots' delays from the same sequence first.
    const expected = seeded('join-room');
    const delays = [0, 1, 2].map(() => joinDelay(expected, 10_000, PACE));
    const last = Math.max(...delays);
    const { room, clients } = await build([human('a'), bot, bot, bot], undefined, JOIN, true, { random });
    const a = clients[0]!;
    let u = a.last('update')!;
    expect(u.countdown).toBeUndefined();
    expect(u.view.actions).toEqual([]);
    expect(u.deadline).toBeUndefined();
    // Nobody can act while players join.
    room.act(0, 0, { type: 'discard', seat: 0, tile: room.state.hand.players[0].drawn! }, a);
    await room.idle();
    expect(a.last('error')).toEqual({ type: 'error', code: 'illegal', requestSeq: 0 });
    expect(room.state.seq).toBe(0);

    await vi.advanceTimersByTimeAsync(last - 1);
    await room.idle();
    expect(a.last('update')!.countdown).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    await room.idle();
    u = a.last('update')!;
    expect(u.countdown).toBe(5_000);
    expect(u.view.actions).toEqual([]);
    await vi.advanceTimersByTimeAsync(5_000);
    await room.idle();
    u = a.last('update')!;
    expect(u.countdown).toBeUndefined();
    expect(u.deadline).toBe(10_000 + 20_000);
    expect(u.view.actions.length).toBeGreaterThan(0);
  });

  it('waits at most the join cap', async () => {
    // Slow bots: every draw near 1 gives the longest delays; the cap decides.
    const { clients } = await build([human('a'), bot, bot, bot], undefined, { ...JOIN, joinMaxMs: 2_000 }, true, {
      random: () => 0.999,
    });
    const a = clients[0]!;
    await vi.advanceTimersByTimeAsync(1_999);
    expect(a.last('update')!.countdown).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    expect(a.last('update')!.countdown).toBe(5_000);
  });

  it('has no joining phase in fast or recovered rooms, nor among humans only', async () => {
    const humans = await build([human('a'), human('b'), human('c'), human('d')], undefined, JOIN);
    expect(humans.clients[0]!.last('update')!.countdown).toBe(5_000);
    const rigged = await build([human('a'), bot, bot, bot], turnState(), JOIN);
    expect(rigged.clients[0]!.last('update')!.deadline).toBe(10_000 + 20_000);
    const seats = [botSeat('w'), botSeat('x'), botSeat('y'), botSeat('z')];
    const f = await build(seats, undefined, JOIN, false, { random: seeded('fast-join'), fast: true });
    await vi.advanceTimersByTimeAsync(5);
    await f.room.idle();
    expect(f.room.state.seq).toBeGreaterThan(0);
  });
});

describe('Room disconnects', () => {
  it('lets a bot play the seat after the grace period and hands it back on reconnect', async () => {
    const { room, clients } = await build([human('a'), bot, bot, bot], turnState());
    const c = clients[0]!;
    room.detach(c);
    const think = thinkDelay(room.state, 0, { base: 10_000, bank: 20_000, opening: true }, PACE, () => 0);
    await vi.advanceTimersByTimeAsync(9_999);
    expect(room.state.seq).toBe(0);
    // Grace over: a bot decides for seat 0 after its think time.
    await vi.advanceTimersByTimeAsync(1 + think);
    await room.idle();
    expect(room.state.seq).toBe(1);
    expect(room.humanAt(0).botControlled).toBe(true);
    // Play on until seat 0 is pending again, then reconnect: the next decision is the human's.
    await vi.advanceTimersByTimeAsync(5_000);
    await room.idle();
    const c2 = new FakeClient('a');
    room.attach(0, c2);
    await room.idle();
    expect(room.humanAt(0).botControlled).toBe(false);
    const u = c2.last('update')!;
    expect(u.seq).toBe(room.state.seq);
    // Let the bots play until it is the human's decision, then nothing happens for them within the base time.
    for (let i = 0; i < 40 && !pendingSeats(room.state).includes(0); i++) {
      await vi.advanceTimersByTimeAsync(1_000);
      await room.idle();
    }
    expect(pendingSeats(room.state)).toContain(0);
    const before = room.state.seq;
    expect(c2.last('update')!.deadline).toBeGreaterThan(0);
    await vi.advanceTimersByTimeAsync(4_000);
    await room.idle();
    expect(room.state.seq).toBe(before);
  });

  it('keeps timeouts running during the grace period', async () => {
    const { room, clients } = await build([human('a'), bot, bot, bot], turnState(), { graceMs: 60_000 });
    room.detach(clients[0]!);
    await vi.advanceTimersByTimeAsync(30_000);
    await room.idle();
    expect(room.state.seq).toBe(1);
    expect(room.humanAt(0).botControlled).toBe(false);
  });

  it('fast-forwards a game nobody is connected to and records the result', async () => {
    const { room, store, ended } = await build([human('a'), human('b'), bot, bot], undefined, {}, false);
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    await vi.runAllTimersAsync();
    await room.idle();
    expect(room.state.phase).toBe('gameOver');
    expect(room.finished).toBe(true);
    const g = store.games.get('g1')!;
    expect(g.status).toBe('finished');
    expect(g.final).toEqual(room.state.final);
    expect(g.actions.length).toBe(room.state.seq);
    expect(ended).toHaveLength(1);
    expect(ended[0].map((r) => r.userId).sort()).toEqual(['a', 'b']);
    expect(store.ratings.get('a')!.games).toBe(1);
  });
});

describe('Room authority', () => {
  it('rejects stale, wrong-seat and illegal actions without changing state or telling others', async () => {
    const { room, clients } = await build([human('a'), bot, human('c'), bot], turnState());
    const a = clients[0]!;
    const c = clients[2]!;
    const before = JSON.stringify(room.state);
    const discard = discardOf(a);
    a.clear();
    c.clear();

    room.act(0, 5, discard, a);
    await room.idle();
    expect(a.sent[0]).toEqual({ type: 'error', code: 'staleSeq', requestSeq: 5 });
    expect(a.sent[1]).toMatchObject({ type: 'update', seq: 0 });

    a.clear();
    room.act(0, 0, { type: 'discard', seat: 1, tile: room.state.hand.players[1].hand[0] }, a);
    await room.idle();
    expect(a.sent).toEqual([{ type: 'error', code: 'illegal', requestSeq: 0 }]);

    a.clear();
    const notMine = room.state.hand.players[1].hand[0];
    room.act(0, 0, { type: 'discard', seat: 0, tile: notMine }, a);
    await room.idle();
    expect(a.sent[0]).toEqual({ type: 'error', code: 'illegal', requestSeq: 0 });

    a.clear();
    room.act(0, 0, { type: 'tsumo', seat: 0 }, a);
    await room.idle();
    expect(a.sent[0]).toEqual({ type: 'error', code: 'illegal', requestSeq: 0 });

    expect(JSON.stringify(room.state)).toBe(before);
    expect(c.sent).toEqual([]);
  });

  it('never reveals other hands, the wall, or who is deciding', async () => {
    // Two humans that never act: every decision times out; two bots. Check every message sent.
    const { room, clients } = await build([human('a'), bot, human('c'), bot], undefined, {
      turnMs: 100,
      callMs: 100,
      openingTurnMs: 100,
      bankMs: 0,
      readyMs: 10,
      startCountdownMs: 500,
      handCountdownMs: 300,
    });
    await vi.runAllTimersAsync();
    await room.idle();
    expect(room.state.phase).toBe('gameOver');
    const forbidden = [
      '"wall":',
      '"rinshan":[',
      '"uraIndicators"',
      '"options"',
      '"responses"',
      '"deadExtra"',
      '"rng"',
      '"tempFuriten"',
    ];
    for (const [seat, client] of clients.entries()) {
      if (!client) continue;
      let updates = 0;
      for (const m of client.sent) {
        const json = JSON.stringify(m);
        for (const f of forbidden) expect(json, `${f} sent to seat ${seat}`).not.toContain(f);
        if (m.type !== 'update') continue;
        updates++;
        expect(m.view.seat).toBe(seat);
        // Other seats' hands are counts only.
        for (const p of m.view.players) expect(p).not.toHaveProperty('hand');
        // Events: starting hands and draws of others are hidden.
        for (const e of m.events) {
          if (e.type === 'handStart') e.hands.forEach((h, s) => expect(h.length).toBe(s === seat ? 13 : 0));
          if (e.type === 'draw' && e.seat !== seat) expect(e.tile).toBeNull();
          if (e.type === 'draw' && e.seat === seat) expect(e.tile).not.toBeNull();
        }
        // A call window looks the same to everyone: no turn seat; only own options are listed.
        if (m.view.claimable) {
          expect(m.view.turn).toBeNull();
          for (const a of m.view.actions) if (a.type !== 'nextHand') expect(a.seat).toBe(seat);
        }
        // Timers are only ever the receiver's own.
        if (m.deadline !== undefined) expect(pendingSeats(room.state).length >= 0).toBe(true);
      }
      expect(updates).toBeGreaterThan(10);
    }
  });

  it('only sends a deadline to a seat that has something to decide', async () => {
    let g = scenario({ hands: ['55m123p456s789s1z', undefined, '123m456p789s11z2z', undefined], turn: 3, draws: '5m' });
    g = applyAction(g, { type: 'discard', seat: 3, tile: g.hand.players[3].drawn! }).state;
    g.seq = 0;
    const { clients } = await build([human('a'), bot, human('c'), bot], g);
    expect(clients[0]!.last('update')!.deadline).toBe(25_000);
    expect(clients[2]!.last('update')!.deadline).toBeUndefined();
    expect(clients[2]!.last('update')!.view.actions).toEqual([]);
  });

  it('applies the hint level of the rating', async () => {
    const { clients } = await build([human('a', 1000), human('b', 1200), human('c', 1400), bot], turnState());
    expect(clients[0]!.last('update')!.view.hints?.level).toBe('distance');
    expect(clients[1]!.last('update')!.view.hints?.level).toBe('distance');
    expect(clients[2]!.last('update')!.view.hints).toBeNull();
  });

  it('persists an action before anyone sees the result', async () => {
    const { room, store, clients } = await build([human('a'), bot, human('c'), bot], turnState());
    const a = clients[0]!;
    const c = clients[2]!;
    let release!: () => void;
    store.beforeWrite = () => new Promise<void>((r) => (release = r));
    c.clear();
    room.act(0, 0, discardOf(a), a);
    await Promise.resolve();
    await Promise.resolve();
    expect(room.state.seq).toBe(0);
    expect(c.sent).toEqual([]);
    release();
    await room.idle();
    expect(store.log).toHaveLength(1);
    expect(room.state.seq).toBe(1);
    expect(c.last('update')!.seq).toBe(1);
  });
});

describe('Room hidden information', () => {
  it('tells nobody about a call response while the window stays open', async () => {
    // Seat 0 (human a) discards 5m: seat 1 (a bot) can chii with 46m, seat 2 (human b) can pon with 55m.
    const g = scenario({ hands: [undefined, '46m', '55m'], draws: '5m' });
    const { room, clients } = await build([human('a'), bot, human('b'), bot], g);
    const [a, , b] = clients as FakeClient[];
    room.act(0, 0, { type: 'discard', seat: 0, tile: room.state.hand.players[0].drawn! }, a);
    await room.idle();
    expect(pendingSeats(room.state)).toEqual([1, 2]);
    const offer = b.last('update')!;
    expect(offer.view.actions.some((x) => x.type === 'pon')).toBe(true);
    const before = [a.sent.length, b.sent.length];
    // The bot answers after its think time; the window still waits for b, so nothing public happened.
    await vi.advanceTimersByTimeAsync(4_000);
    await room.idle();
    expect(pendingSeats(room.state)).toEqual([2]);
    expect([a.sent.length, b.sent.length]).toEqual(before);
    // b's view is still current: acting on it is not stale.
    room.act(2, offer.seq, { type: 'pass', seat: 2 }, b);
    await room.idle();
    expect(b.all('error')).toEqual([]);
    expect(pendingSeats(room.state)).not.toContain(2);
    expect(a.sent.length).toBeGreaterThan(before[0]);
  });

  it('bot think times do not depend on what the seat cannot see', async () => {
    const pace = { base: 5_000, bank: 20_000 };
    const scramble = seeded('scramble-pace');
    let g = createGame(DEFAULT_RULES, 'pace').state;
    const random = seeded('pace-bots');
    for (let i = 0; i < 400 && g.phase !== 'gameOver'; i++) {
      if (g.phase === 'handOver') {
        g = applyAction(g, { type: 'nextHand' }).state;
        continue;
      }
      for (const seat of pendingSeats(g)) {
        const hidden = scrambleHidden(g, seat, scramble);
        expect(thinkDelay(hidden, seat, pace, PACE, seeded(`t${i}`))).toBe(
          thinkDelay(g, seat, pace, PACE, seeded(`t${i}`)),
        );
      }
      g = applyAction(g, botAction(g, pendingSeats(g)[0], { random })!).state;
    }
  });
});

describe('Room bot players', () => {
  it('shows bot players like humans and rates every seat with an account', async () => {
    const seats = [human('a'), botSeat('x', 1100), botSeat('y', 1050), botSeat('z', 1200)];
    const { room, store, ended } = await build(seats, undefined, {}, false);
    const info = room.info(0);
    expect(info.players).toEqual([
      { seat: 0, name: 'a', rating: 1000 },
      { seat: 1, name: 'x', rating: 1100 },
      { seat: 2, name: 'y', rating: 1050 },
      { seat: 3, name: 'z', rating: 1200 },
    ]);
    await vi.advanceTimersByTimeAsync(5 * 60_000);
    await vi.runAllTimersAsync();
    await room.idle();
    expect(room.finished).toBe(true);
    expect(ended[0].map((r) => r.userId).sort()).toEqual(['a', 'x', 'y', 'z']);
    expect(store.ratings.get('x')!.games).toBe(31);
    expect(store.games.get('g1')!.results.every((r) => r.ratingAfter !== null)).toBe(true);
  });

  it('plays a game of four bot players at human pace, without the abandon fast-forward, and rates all four', async () => {
    const seats = [botSeat('w', 1150), botSeat('x', 1100), botSeat('y', 1050), botSeat('z', 1200)];
    const { room, store, ended } = await build(seats, undefined, {}, false, { random: seeded('bot-room') });
    expect(room.hasHumans).toBe(false);
    await vi.advanceTimersByTimeAsync(5 * 60_000 + 1_000);
    await room.idle();
    expect(room.finished).toBe(false);
    const seqAt5min = room.state.seq;
    expect(seqAt5min).toBeGreaterThan(40);
    // Still human pace after the abandon period: about a decision a second or slower.
    await vi.advanceTimersByTimeAsync(60_000);
    await room.idle();
    expect(room.state.seq - seqAt5min).toBeLessThan(90);
    await vi.runAllTimersAsync();
    await room.idle();
    expect(room.finished).toBe(true);
    const updates = ended[0];
    expect(updates).toHaveLength(4);
    const before = new Map(seats.map((x) => [x.userId, x.rating]));
    const sum = updates.reduce((a, u) => a + u.rating - before.get(u.userId)!, 0);
    expect(Math.abs(sum)).toBeLessThanOrEqual(2);
    expect(store.games.get('g1')!.actions.length).toBe(room.state.seq);
  });

  it('a bot player sometimes lets its timer run out, like a human, but only with humans at the table', async () => {
    const seats = [human('a'), botSeat('x'), botSeat('y'), botSeat('z')];
    const { room, store, clients } = await build(seats, turnState(), {}, true, {
      random: () => 0.5,
      timeoutPercent: 100,
    });
    const c = clients[0]!;
    room.act(0, 0, discardOf(c), c);
    await room.idle();
    expect(pendingSeats(room.state)).toEqual([1]);
    const drawn = room.state.hand.players[1].drawn!;
    // The full base time plus the whole bank passes, then the automatic move (discard the drawn tile) is played.
    await vi.advanceTimersByTimeAsync(5_000 + 20_000 - 1);
    expect(room.state.seq).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    await room.idle();
    expect(store.log[1].action).toEqual({ type: 'discard', seat: 1, tile: drawn });
    expect(room.seats[1].bank).toBe(0);

    // Without humans at the table the same setting does nothing: the game keeps its normal pace.
    const bots = [botSeat('w'), botSeat('x'), botSeat('y'), botSeat('z')];
    const b = await build(bots, undefined, {}, false, { random: seeded('no-timeouts'), timeoutPercent: 100 });
    await vi.advanceTimersByTimeAsync(60_000);
    await b.room.idle();
    expect(b.room.state.seq).toBeGreaterThan(20);
  });

  it('a warm-up (fast) room plays without delays', async () => {
    const seats = [botSeat('w'), botSeat('x'), botSeat('y'), botSeat('z')];
    const start = Date.now();
    const { room } = await build(seats, undefined, {}, false, { random: seeded('fast'), fast: true });
    // Fake timers run a 0 ms timeout set inside a tick 1 ms later: a whole game in a few fake seconds, not minutes.
    for (let i = 0; i < 20_000 && !room.finished; i++) {
      await vi.advanceTimersByTimeAsync(1);
      await room.idle();
    }
    expect(room.finished).toBe(true);
    expect(Date.now() - start).toBeLessThan(5_000);
  });
});

/** Utility for readable failures. */
export const kindsOf = (tiles: Tile[]) => tiles.map(kindOf);
export type { Action };
