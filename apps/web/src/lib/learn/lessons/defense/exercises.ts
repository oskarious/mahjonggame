import type { Exercise } from '@mahjong/drills/types';

export const exercises: Record<string, Exercise> = {
  safe: {
    kind: 'discard',
    prompt: 'The player across declared riichi, then the player on your left discarded {7s}. Discard a completely safe tile.',
    position: {
      hands: ['23m456p789s55m3z7s1p'],
      discards: [undefined, undefined, '9m4p6s2z1z8m', '5z7s'],
      riichi: [2],
      passed: '7s',
      dealer: 3,
      turn: 0,
      draws: '8p',
    },
    goal: { safest: 2 },
    show: { ponds: [2, 3] },
    why: '{4p} is in their river, and they let {7s} pass after declaring: they can ron neither.',
  },
  suji: {
    kind: 'choice',
    prompt: 'A riichi player discarded {4p}. Which tile is suji, safe from a two-sided wait?',
    options: ['{1p}', '{2p}', '{3p}'],
    answer: 0,
    why: 'A two-sided wait on {1p} would also wait on {4p}, which would make them furiten.',
  },
  wall: {
    kind: 'pick',
    prompt: 'All four {7m} are visible. Tap the tiles in your hand that no two-sided wait can use.',
    position: { hands: ['789m123p456p789s5s'], discards: [undefined, '77m', '7m'], dealer: 3, turn: 1 },
    goal: 'no-chance',
    show: { ponds: [1, 2] },
    why: 'Only {67m} or {78m} could wait two-sided on {8m} or {9m}, and both need a {7m}.',
  },
};
