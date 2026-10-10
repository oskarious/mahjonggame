import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES, applyAction, botAction, createGame, legalActions, pendingSeats } from '@mahjong/engine';
import { isValidUsername } from '@mahjong/protocol';
import { botName } from '../src/names.ts';
import { DEFAULT_BOT_SETTINGS } from '../src/settings.ts';
import { joinDelay, readyDelay, thinkDelay } from '../src/pacing.ts';
import { seeded } from './helpers.ts';

const TURN = 5_000;
const CALL = 5_000;
const OPENING = 10_000;
const PACE = { base: TURN, bank: 20_000 };
const P = DEFAULT_BOT_SETTINGS;
const scaled = (thinkScale: number) => ({ ...P, thinkScale });

describe('thinkDelay', () => {
  it('varies, sometimes runs into the bank, and never reaches the deadline', () => {
    const random = seeded('pace');
    let g = createGame(DEFAULT_RULES, 'pace').state;
    const turnDelays: number[] = [];
    const openingDelays: number[] = [];
    const all: number[] = [];
    // Walk a real game, sampling the delay for every decision a seat has to make.
    for (let steps = 0; steps < 3_000 && g.phase !== 'gameOver'; steps++) {
      if (g.phase === 'handOver') {
        g = applyAction(g, { type: 'nextHand' }).state;
        continue;
      }
      const seat = pendingSeats(g)[0];
      const turn = g.hand.step.type === 'turn';
      const opening = turn && seat === g.dealer && g.hand.players[seat].discards.length === 0;
      const base = opening ? OPENING : turn ? TURN : CALL;
      for (let i = 0; i < 5; i++) {
        const d = thinkDelay(g, seat, { ...PACE, base, opening }, P, random);
        all.push(d);
        if (opening) openingDelays.push(d);
        else if (turn && legalActions(g, seat).length > 1) turnDelays.push(d);
        expect(d).toBeLessThanOrEqual(base + PACE.bank - 1_000);
        expect(d).toBeGreaterThanOrEqual(0);
      }
      g = applyAction(g, botAction(g, seat, { skill: 0.5, random })!).state;
    }
    expect(new Set(all).size).toBeGreaterThan(all.length / 2);
    expect(turnDelays.some((d) => d > TURN)).toBe(true);
    const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
    expect(median(turnDelays)).toBeGreaterThan(600);
    expect(median(turnDelays)).toBeLessThan(3_000);
    // The dealer studies the fresh hand: longer than a normal turn, still well inside the 10 s.
    expect(openingDelays.length).toBeGreaterThan(10);
    expect(median(openingDelays)).toBeGreaterThan(median(turnDelays) * 1.4);
    expect(median(openingDelays)).toBeLessThan(5_000);
  });

  it('scales with the setting and stops short of an empty bank', () => {
    const g = createGame(DEFAULT_RULES, 'forced').state;
    const seat = pendingSeats(g)[0];
    expect(thinkDelay(g, seat, PACE, scaled(0), Math.random)).toBe(0);
    const slow = thinkDelay(g, seat, PACE, scaled(2), () => 0.5);
    const normal = thinkDelay(g, seat, PACE, P, () => 0.5);
    expect(slow).toBe(Math.min(2 * normal, PACE.base + PACE.bank - 1_000));
    // A long think with no bank left still ends a second before the base time runs out.
    expect(thinkDelay(g, seat, { ...PACE, bank: 0 }, scaled(5), () => 0.99)).toBe(PACE.base - 1_000);
    expect(thinkDelay(g, seat, { ...PACE, base: OPENING, opening: true, bank: 0 }, scaled(5), () => 0.99)).toBe(
      OPENING - 1_000,
    );
  });
});

describe('pace settings', () => {
  it('delays follow the configured medians and floors', () => {
    const g = createGame(DEFAULT_RULES, 'settings').state;
    const seat = pendingSeats(g)[0];
    const random = seeded('pace-settings');
    const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
    const turn = (thinkTurnMs: number) =>
      median(
        Array.from({ length: 500 }, () =>
          thinkDelay(g, seat, { base: 60_000, bank: 0 }, { ...P, thinkTurnMs, longThinkPercent: 0 }, random),
        ),
      );
    expect(turn(5_000)).toBeGreaterThan(turn(900) + 3_000);
    const joins = Array.from({ length: 500 }, () =>
      joinDelay(random, 60_000, { ...P, joinMedianMs: 5_000, joinMinMs: 4_000 }),
    );
    expect(Math.min(...joins)).toBeGreaterThanOrEqual(4_000);
    expect(median(joins)).toBeGreaterThan(4_500);
    const readies = Array.from({ length: 500 }, () =>
      readyDelay(random, 12_000, { ...P, readySlowPercent: 0, readyMinMs: 2_000 }),
    );
    expect(Math.min(...readies)).toBeGreaterThanOrEqual(2_000);
    const slow = Array.from({ length: 500 }, () =>
      readyDelay(random, 12_000, { ...P, readySlowPercent: 100, readySlowFromMs: 9_000 }),
    );
    expect(Math.min(...slow)).toBeGreaterThanOrEqual(9_000);
  });
});

describe('joinDelay', () => {
  it('varies around a second or two, within the cap, and scales', () => {
    const random = seeded('join');
    const ds = Array.from({ length: 2_000 }, () => joinDelay(random, 10_000, P));
    expect(Math.min(...ds)).toBeGreaterThanOrEqual(400);
    expect(Math.max(...ds)).toBeLessThanOrEqual(10_000);
    const median = [...ds].sort((a, b) => a - b)[1_000];
    expect(median).toBeGreaterThan(1_000);
    expect(median).toBeLessThan(2_200);
    expect(ds.some((d) => d > 3_500)).toBe(true);
    expect(joinDelay(Math.random, 10_000, scaled(0))).toBe(0);
    expect(joinDelay(() => 0.99, 2_000, scaled(5))).toBe(2_000);
  });
});

describe('readyDelay', () => {
  it('confirms mostly within a few seconds, sometimes slowly, never past the ready timeout', () => {
    const random = seeded('ready');
    const ds = Array.from({ length: 2_000 }, () => readyDelay(random, 12_000, P));
    expect(Math.min(...ds)).toBeGreaterThanOrEqual(800);
    expect(Math.max(...ds)).toBeLessThanOrEqual(12_000);
    const sorted = [...ds].sort((a, b) => a - b);
    const median = sorted[1_000];
    expect(median).toBeGreaterThan(1_800);
    expect(median).toBeLessThan(3_500);
    const slow = ds.filter((d) => d >= 6_000).length / ds.length;
    expect(slow).toBeGreaterThan(0.04);
    expect(slow).toBeLessThan(0.2);
    expect(new Set(ds).size).toBeGreaterThan(ds.length / 2);
  });

  it('scales with the setting', () => {
    expect(readyDelay(Math.random, 12_000, scaled(0))).toBe(0);
    const one = readyDelay(() => 0.5, 12_000, P);
    expect(readyDelay(() => 0.5, 12_000, scaled(2))).toBe(2 * one);
    expect(readyDelay(() => 0.5, 1_000, scaled(5))).toBe(1_000);
  });
});

describe('botName', () => {
  it('makes valid, varied usernames', () => {
    const random = seeded('names');
    const names = Array.from({ length: 500 }, () => botName(random));
    expect(names.every(isValidUsername)).toBe(true);
    expect(new Set(names.map((n) => n.toLowerCase())).size).toBeGreaterThan(450);
    expect(names.some((n) => /_/.test(n))).toBe(true);
    expect(names.some((n) => /\d$/.test(n))).toBe(true);
    expect(names.some((n) => /^[A-Z]/.test(n))).toBe(true);
  });
});
