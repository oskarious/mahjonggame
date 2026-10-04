import type { Exercise } from '@mahjong/drills/types';

export const exercises: Record<string, Exercise> = {
  count: {
    kind: 'choice',
    prompt: 'How many blocks does this hand have?',
    position: { hands: ['123m45p79s99m456s2z'], dealer: 3, turn: 1 },
    options: ['Four', 'Five', 'Six'],
    answer: 1,
    claim: { shanten: 1 },
    why: '{123m}, {45p}, {79s}, {99m} and {456s}; the {2z} is a loose tile.',
  },
  six: {
    kind: 'discard',
    prompt: 'You drew {8s}: six blocks. Which discard keeps the most useful tiles?',
    position: { hands: ['45m99m234p79p34s67s'], dealer: 3, turn: 0, draws: '8s' },
    goal: 'max-ukeire',
    why: '{79p} is the only block weaker than two-sided.',
  },
  four: {
    kind: 'discard',
    prompt: 'You drew {1s}: four blocks and four loose tiles. Which discard keeps the most useful tiles?',
    position: { hands: ['234m678p99s45s1p6m9m'], dealer: 3, turn: 0, draws: '1s' },
    goal: 'max-ukeire',
    why: 'Keep {6m}, the tile most likely to become the fifth block; {9m} adds the least.',
  },
};
