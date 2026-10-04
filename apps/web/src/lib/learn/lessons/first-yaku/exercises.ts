import type { Exercise } from '@mahjong/drills/types';

export const exercises: Record<string, Exercise> = {
  tanpin: {
    kind: 'yaku',
    expect: ['tanyao', 'pinfu'],
    prompt: 'You win by ron on {4s}. Tap every yaku this hand has.',
    position: {
      hands: ['234m456p678s55m23s'],
      dealer: 3,
      turn: 2,
      draws: '4s',
      discard: true,
    },
    why: 'Only 2 to 8 makes all simples; four sequences, a plain pair and a two-sided wait make pinfu.',
  },
  haku: {
    kind: 'yaku',
    expect: ['yakuhaiWhite', 'menzenTsumo'],
    prompt: 'You draw {9s} and win. Which yaku does the hand have?',
    position: {
      hands: ['555z123m456p78s99s'],
      dealer: 3,
      turn: 0,
      draws: '9s',
    },
    why: 'The white dragon triplet, and self-draw with a closed hand.',
  },
  wind: {
    kind: 'yaku',
    show: { seat: true, round: true },
    expect: ['seatWind'],
    prompt: 'You sit South in the East round and win by ron. Which yaku?',
    position: {
      hands: ['222z123m456p78s99s'],
      dealer: 3,
      turn: 2,
      draws: '6s',
      discard: true,
    },
    why: 'South is your seat wind, so the triplet is a value triplet.',
  },
  kanchan: {
    kind: 'can-win',
    expect: 'no-yaku',
    prompt: 'Closed hand, no riichi, and {4s} is discarded. Can you win?',
    position: {
      hands: ['123m456p789s55m35s'],
      dealer: 3,
      turn: 2,
      draws: '4s',
      discard: true,
    },
    why: 'A closed wait breaks pinfu, and the terminals rule out all simples.',
  },
  opentan: {
    kind: 'can-win',
    expect: 'yes',
    prompt: 'You called chii on {234m}, and {4s} is discarded. Can you win?',
    position: {
      hands: ['456p678s55m23s'],
      melds: [[['chii', '234m']]],
      dealer: 3,
      turn: 1,
      draws: '4s',
      discard: true,
    },
    why: 'All simples counts with an open hand on Riichi Arena.',
  },
};
