import type { Exercise } from '../../types';

export const exercises: Record<string, Exercise> = {
  pon: {
    kind: 'call',
    prompt: 'The player on your right discards {5z}, and you hold a pair of them. Call or pass?',
    position: {
      hands: ['55z123m456p78s99s1m'],
      dealer: 3,
      turn: 1,
      draws: '5z',
      discard: true,
    },
    goal: 'pon',
    show: { ponds: [1] },
    why: 'A dragon triplet is a yaku, so the hand can still win after calling.',
  },
  chii: {
    kind: 'call',
    prompt: 'The player on your left discards {5m}. Complete {34m} with it.',
    position: {
      hands: ['34m678p12s555z99p7z'],
      dealer: 3,
      turn: 3,
      draws: '5m',
      discard: true,
    },
    goal: 'chii',
    show: { ponds: [3] },
    why: 'The hand already has a dragon triplet, so it keeps a yaku when open.',
  },
  who: {
    kind: 'choice',
    prompt: 'Who can you chii from?',
    options: ['Anyone', 'Only the player on your left', 'Only the player across'],
    answer: 1,
    why: 'Chii only takes the discard of the player just before you.',
  },
  kan: {
    kind: 'call',
    prompt: 'You hold three red dragons, and the player on your right discards the fourth. Make a quad.',
    position: {
      hands: ['777z123m456p67s99s'],
      dealer: 3,
      turn: 1,
      draws: '7z',
      discard: true,
    },
    goal: 'daiminkan',
    show: { ponds: [1] },
    why: 'A kan: you draw a replacement tile, and a new dora indicator is turned over. Open kans are best when, like here, you are in tenpai with a good wait.',
  },
  priority: {
    kind: 'choice',
    prompt: 'One player calls pon and another calls chii on the same tile. Who gets it?',
    options: ['The pon', 'The chii', 'Whoever spoke first'],
    answer: 0,
    why: 'Ron beats pon and kan, and those beat chii.',
  },
  trap: {
    kind: 'can-win',
    expect: 'no-yaku',
    prompt: 'You called chii on {123m}, and now {8s} is discarded. Can you win?',
    position: {
      hands: ['456p789s55m67s'],
      melds: [[['chii', '123m']]],
      dealer: 3,
      turn: 1,
      draws: '8s',
      discard: true,
    },
    why: 'Open, with terminals and no value tiles, nothing is left. Kept closed, this hand could have declared riichi.',
  },
};
