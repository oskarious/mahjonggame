import type { Exercise } from '../../types';

export const exercises: Record<string, Exercise> = {
  kanchan: {
    kind: 'pick',
    prompt: 'Which tile completes this hand?',
    position: { hands: ['123m456p789s55m35s'], dealer: 3, turn: 1 },
    goal: 'waits',
    why: 'A kanchan waits only for the middle tile: {4s}.',
  },
  shanpon: {
    kind: 'pick',
    prompt: 'Two pairs: tap every tile that wins.',
    position: { hands: ['123m456p789s55m77s'], dealer: 3, turn: 1 },
    goal: 'waits',
    why: 'Either pair can become the triplet: {5m} or {7s}.',
  },
  nobetan: {
    kind: 'pick',
    prompt: 'Four in a row: tap every tile that wins.',
    position: { hands: ['123m456p789s3456s'], dealer: 3, turn: 1 },
    goal: 'waits',
    why: '{345s} plus a lone {6s}, or a lone {3s} plus {456s}.',
  },
  three: {
    kind: 'pick',
    prompt: 'Five in a row: tap every tile that wins.',
    position: { hands: ['123m456p23456s99s'], dealer: 3, turn: 1 },
    goal: 'waits',
    why: '{23s} plus {456s} waits on {1s} or {4s}; {234s} plus {56s} waits on {4s} or {7s}.',
  },
  tricky: {
    kind: 'pick',
    prompt: 'Seven in a row: find every winning tile.',
    position: { hands: ['123m456p2345678s'], dealer: 3, turn: 1 },
    goal: 'waits',
    why: 'Split the seven tiles every way you can: {2s}, {5s} and {8s} all work.',
  },
};
