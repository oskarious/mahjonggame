import { describe, expect, it } from 'vitest';
import {
  type Action,
  BOT_ELO_RANGE,
  botAction,
  botElo,
  botProfile,
  kindOf,
  kindToString,
  skillForElo,
} from '../src/index.ts';
import { discard, play, rig } from './helpers.ts';

const kindOfAction = (a: Action | null) =>
  a && 'tile' in a ? kindToString(kindOf(a.tile)) : a?.type ?? null;
/** Deterministic: no blunders, and softmax (if any) picks the best option. */
const noLuck = () => 0.999;

describe('bot profiles', () => {
  it('every knob gets better with skill', () => {
    const low = botProfile(0);
    const high = botProfile(1);
    expect(low.blunderRate).toBeGreaterThan(high.blunderRate);
    expect(low.noise).toBeGreaterThan(high.noise);
    expect(high.noise).toBe(0);
    expect(high.blunderRate).toBe(0);
    expect([low.defense, low.valueAware]).toEqual([0, 0]);
    expect([high.defense, high.valueAware]).toEqual([1, 1]);
    expect([low.callStyle, high.callStyle]).toEqual(['none', 'smart']);
    expect([low.riichiStyle, high.riichiStyle]).toEqual(['always', 'smart']);
  });

  it('clamps out-of-range skills', () => {
    expect(botProfile(-1)).toEqual(botProfile(0));
    expect(botProfile(3)).toEqual(botProfile(1));
  });

  it('a beginner sometimes throws a random tile', () => {
    const g = rig({ hands: ['123m456p789s55m23s'], draws: '1z' });
    const plain = (a: Action | null) => a?.type === 'discard' && !a.riichi;
    // random() = 0 always triggers the blunder branch at skill 0, which takes the first legal tile.
    const a = botAction(g, 0, { skill: 0, random: () => 0 });
    expect(plain(a)).toBe(true);
    expect(kindOfAction(a)).toBe('1m');
  });
});

describe('bot ratings', () => {
  it('Elo rises with skill and maps back to the same skill', () => {
    let prev = -Infinity;
    for (let s = 0; s <= 1.0001; s += 0.05) {
      const elo = botElo(s);
      expect(elo).toBeGreaterThanOrEqual(prev);
      prev = elo;
      if (BOT_ELO_RANGE[0] < elo && elo < BOT_ELO_RANGE[1]) {
        expect(botElo(skillForElo(elo))).toBeCloseTo(elo, 5);
      }
    }
  });

  it('clamps Elo targets outside what the bots can do', () => {
    expect(skillForElo(0)).toBe(0);
    expect(skillForElo(9999)).toBe(1);
    expect(BOT_ELO_RANGE[0]).toBeLessThan(BOT_ELO_RANGE[1]);
  });
});

describe('defense', () => {
  // Far from tenpai; seat 1 is in riichi and has discarded 5m.
  const messy = '147m2358p469s5m1z';
  const setup = () => rig({ hands: [messy], draws: '7p', riichi: [1], discards: [undefined, '5m9m'] });

  it('folds with a safe tile (genbutsu) when far from tenpai', () => {
    expect(kindOfAction(botAction(setup(), 0, { skill: 1, random: noLuck }))).toBe('5m');
  });

  it('a bot without defense just plays for efficiency', () => {
    const a = botAction(setup(), 0, { profile: { ...botProfile(1), defense: 0 }, random: noLuck });
    expect(kindOfAction(a)).not.toBe('5m');
  });

  it('pushes a good tenpai instead of breaking it for a safe tile', () => {
    // Tenpai on 1s/4s; drew a live 6m. Folding would mean throwing 2s (genbutsu) and losing tenpai.
    const g = rig({ hands: ['123m456p789s55m23s'], draws: '6m', riichi: [1], discards: [undefined, '2s'] });
    expect(kindOfAction(botAction(g, 0, { skill: 1, random: noLuck }))).toBe('6m');
  });
});

describe('calls', () => {
  const callWindow = (seat1: string, tile: string) =>
    play(rig({ hands: [tile, seat1] }), [discard(0, tile)], { settle: false }).state;

  it('pons a value honour', () => {
    const g = callWindow('55z123m456p78s99s', '5z');
    expect(botAction(g, 1, { skill: 1, random: noLuck })?.type).toBe('pon');
    expect(botAction(g, 1, { skill: 0.4, random: noLuck })?.type).toBe('pon');
    expect(botAction(g, 1, { skill: 0.1, random: noLuck })?.type).toBe('pass');
  });

  it('smart bots call for all simples when it speeds up the hand', () => {
    const g = callWindow('44p234m567s66s3p78p', '4p');
    expect(botAction(g, 1, { skill: 1, random: noLuck })?.type).toBe('pon');
    // Medium bots only call value honours.
    expect(botAction(g, 1, { skill: 0.4, random: noLuck })?.type).toBe('pass');
  });

  it('does not make calls that leave the hand without a yaku', () => {
    const g = callWindow('22m345p678s99m14z5z', '2m');
    expect(botAction(g, 1, { skill: 1, random: noLuck })?.type).toBe('pass');
  });
});

describe('riichi', () => {
  // Tenpai on 6s/9s with a white dragon triplet; 3s is dora (indicator 2s), and there's a pair of them.
  const hand = '555z123m456p78s33s';

  it('smart bots stay silent with a hand that already has a yaku and value', () => {
    const g = rig({ hands: [hand], draws: '1z', dora: '2s' });
    const a = botAction(g, 0, { skill: 1, random: noLuck });
    expect(a).toMatchObject({ type: 'discard' });
    expect(a && 'riichi' in a && a.riichi).toBeFalsy();
  });

  it('simpler bots always declare riichi', () => {
    const g = rig({ hands: [hand], draws: '1z', dora: '2s' });
    expect(botAction(g, 0, { skill: 0.5, random: noLuck })).toMatchObject({ type: 'discard', riichi: true });
  });

  it('smart bots still riichi a cheap hand', () => {
    const g = rig({ hands: [hand], draws: '1z' });
    expect(botAction(g, 0, { skill: 1, random: noLuck })).toMatchObject({ type: 'discard', riichi: true });
  });
});
