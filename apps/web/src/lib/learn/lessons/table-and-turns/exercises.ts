import type { Exercise } from '@mahjong/drills/types';

export const exercises: Record<string, Exercise> = {
  next: {
    kind: 'choice',
    prompt: 'You just discarded. Who plays next?',
    options: ['The player on your right', 'The player across', 'The player on your left'],
    answer: 0,
    why: 'Play goes counter-clockwise: East, South, West, North.',
  },
  indicator: {
    kind: 'pick',
    prompt: 'The dora indicator is {3p}. Tap the dora.',
    position: { hands: ['123m456p789s55m45p'], dealer: 3, turn: 1, dora: '3p' },
    goal: 'dora',
    why: 'The dora is the tile after the indicator: {4p}.',
  },
  junk: {
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
};
