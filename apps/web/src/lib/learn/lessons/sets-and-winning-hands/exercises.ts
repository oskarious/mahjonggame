import type { Exercise } from '../../types';

export const exercises: Record<string, Exercise> = {
  finish: {
    kind: 'pick',
    prompt: 'Which tiles turn {67s} into a sequence?',
    position: { hands: ['123m456p789s11z67s'], dealer: 3, turn: 1 },
    goal: 'waits',
    from: '4s5s8s9s',
    why: '{567s} or {678s}: a two-sided shape waits on both ends.',
  },
  wrap: {
    kind: 'choice',
    prompt: 'Is {891p} a sequence?',
    options: ['Yes', 'No'],
    answer: 1,
    why: 'Sequences never wrap around: 9 is the end of the suit.',
  },
  winds: {
    kind: 'choice',
    prompt: 'Can {123z} (East, South, West) be a set?',
    options: ['Yes', 'No'],
    answer: 1,
    why: 'Honors have no order, so they only make triplets and pairs.',
  },
  incomplete: {
    kind: 'can-win',
    expect: 'not-complete',
    prompt: 'You drew {9s}. Is your hand complete?',
    position: {
      hands: ['123m456p789s11z67s'],
      dealer: 3,
      turn: 0,
      draws: '9s',
    },
    why: '{679s} is not a sequence: you need {5s} or {8s}.',
  },
  pairs: {
    kind: 'can-win',
    expect: 'yes',
    prompt: 'You drew {7z}. Can you win with seven pairs?',
    position: { hands: ['1133m5577p2266s7z'], dealer: 3, turn: 0, draws: '7z' },
    why: 'Seven different pairs is a winning hand of its own.',
  },
};
