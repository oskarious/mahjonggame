import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES, applyAction, botAction, createGame, legalActions, pendingSeats } from '@mahjong/engine';
import { isValidUsername } from '@mahjong/protocol';
import { botName } from '../src/names.ts';
import { thinkDelay } from '../src/pacing.ts';
import { seeded } from './helpers.ts';

const PACE = { turnMs: 8_000, callMs: 5_000, bank: 15_000, scale: 1 };

describe('thinkDelay', () => {
  it('varies, sometimes runs into the bank, and never reaches the deadline', () => {
    const random = seeded('pace');
    let g = createGame(DEFAULT_RULES, 'pace').state;
    const turnDelays: number[] = [];
    const all: number[] = [];
    // Walk a real game, sampling the delay for every decision a seat has to make.
    for (let steps = 0; steps < 3_000 && g.phase !== 'gameOver'; steps++) {
      if (g.phase === 'handOver') {
        g = applyAction(g, { type: 'nextHand' }).state;
        continue;
      }
      const seat = pendingSeats(g)[0];
      for (let i = 0; i < 5; i++) {
        const d = thinkDelay(g, seat, PACE, random);
        all.push(d);
        if (g.hand.step.type === 'turn' && legalActions(g, seat).length > 1) turnDelays.push(d);
        const base = g.hand.step.type === 'turn' ? PACE.turnMs : PACE.callMs;
        expect(d).toBeLessThanOrEqual(base + PACE.bank - 1_000);
        expect(d).toBeGreaterThanOrEqual(0);
      }
      g = applyAction(g, botAction(g, seat, { skill: 0.5, random })!).state;
    }
    expect(new Set(all).size).toBeGreaterThan(all.length / 2);
    expect(turnDelays.some((d) => d > PACE.turnMs)).toBe(true);
    const sorted = [...turnDelays].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    expect(median).toBeGreaterThan(600);
    expect(median).toBeLessThan(3_000);
  });

  it('scales with the setting and stops short of an empty bank', () => {
    const g = createGame(DEFAULT_RULES, 'forced').state;
    const seat = pendingSeats(g)[0];
    expect(thinkDelay(g, seat, { ...PACE, scale: 0 }, Math.random)).toBe(0);
    const slow = thinkDelay(g, seat, { ...PACE, scale: 2 }, () => 0.5);
    const normal = thinkDelay(g, seat, PACE, () => 0.5);
    expect(slow).toBe(Math.min(2 * normal, PACE.turnMs + PACE.bank - 1_000));
    // A long think with no bank left still ends a second before the base time runs out.
    expect(thinkDelay(g, seat, { ...PACE, bank: 0, scale: 5 }, () => 0.99)).toBe(PACE.turnMs - 1_000);
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
