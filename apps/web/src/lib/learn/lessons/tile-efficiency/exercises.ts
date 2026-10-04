import type { Exercise } from '../../types';

export const exercises: Record<string, Exercise> = {
  honor: {
    kind: 'discard',
    prompt: 'You drew {6m}. Which discard keeps the most useful tiles?',
    position: {
      hands: ['24m57p35s99m123p9s7z'],
      dealer: 3,
      turn: 0,
      draws: '6m',
    },
    goal: 'max-ukeire',
    only: '7z',
    why: 'A lone honor can only become a pair; a lone {9s} can still grow into {789s}.',
  },
  shape: {
    kind: 'discard',
    prompt: 'You drew {9m} and have one shape too many. What goes?',
    position: {
      hands: ['123s456s78p13m45p9m'],
      dealer: 3,
      turn: 0,
      draws: '9m',
    },
    goal: 'max-ukeire',
    only: '13m',
    why: 'Breaking the closed {13m} keeps both two-sided shapes.',
  },
  count: {
    kind: 'pick',
    prompt: 'Tap every tile that would bring this hand closer to tenpai.',
    position: { hands: ['123s456s78p45p99m3z'], dealer: 3, turn: 1 },
    goal: 'ukeire',
    why: '{3p} and {6p} complete {45p}; {6p} and {9p} complete {78p}.',
  },
};
