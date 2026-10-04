import type { ExerciseSet } from '../../context';

export const exercises: Record<string, ExerciseSet> = {
  next: [
    {
      kind: 'choice',
      prompt: 'You just discarded. Who plays next?',
      options: ['The player on your right', 'The player across', 'The player on your left'],
      answer: 0,
      why: 'Play goes counter-clockwise: East, South, West, North.',
    },
    {
      kind: 'choice',
      prompt: 'The player across just discarded. Who plays next?',
      options: ['The player on your right', 'You', 'The player on your left'],
      answer: 2,
      why: 'Counter-clockwise: you, right, across, left, and back to you.',
    },
    {
      kind: 'choice',
      prompt: 'The player on your left just discarded. Who plays next?',
      options: ['The player across', 'You', 'The player on your right'],
      answer: 1,
      why: 'The player on your left always plays just before you.',
    },
  ],
  indicator: [
    {
      kind: 'pick',
      prompt: 'The dora indicator is {3p}. Tap the dora.',
      position: { hands: ['123m456p789s55m45p'], dealer: 3, turn: 1, dora: '3p' },
      goal: 'dora',
      why: 'The dora is the tile after the indicator: {4p}.',
    },
    {
      kind: 'pick',
      prompt: 'The dora indicator is {6s}. Tap the dora.',
      position: { hands: ['234p567s111m88s67m'], dealer: 3, turn: 1, dora: '6s' },
      goal: 'dora',
      why: 'The dora is the tile after the indicator: {7s}.',
    },
    {
      kind: 'pick',
      prompt: 'The dora indicator is {9m}. Tap the dora.',
      position: { hands: ['345m678p222s99p78s'], dealer: 3, turn: 1, dora: '9m' },
      goal: 'dora',
      why: 'After 9 the count starts again at 1: the dora is {1m}.',
    },
  ],
  junk: [
    {
      kind: 'discard',
      show: { round: true, dora: true, wall: true },
      prompt: 'You drew {3z}. Which tile helps your hand least?',
      position: {
        hands: ['13m456p78s11z99m2s5z'],
        dealer: 3,
        turn: 0,
        draws: '3z',
      },
      goal: 'min-shanten',
      why: 'Lone honors and lone tiles far from your other tiles are the first to go.',
    },
    {
      kind: 'discard',
      show: { round: true, dora: true, wall: true },
      prompt: 'You drew {9m}. Which tile helps your hand least?',
      position: {
        hands: ['24p567m89s33z11s7p4z'],
        dealer: 3,
        turn: 0,
        draws: '9m',
      },
      goal: 'min-shanten',
      why: 'Lone honors and lone tiles far from your other tiles are the first to go.',
    },
    {
      kind: 'discard',
      show: { round: true, dora: true, wall: true },
      prompt: 'You drew {6z}. Which tile helps your hand least?',
      position: {
        hands: ['345s68p12m55p9s1z77m'],
        dealer: 3,
        turn: 0,
        draws: '6z',
      },
      goal: 'min-shanten',
      why: 'Lone honors and lone tiles far from your other tiles are the first to go.',
    },
  ],
};
