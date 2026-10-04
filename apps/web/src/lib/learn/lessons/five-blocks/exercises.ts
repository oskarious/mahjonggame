import type { ExerciseSet } from '../../context';

export const exercises: Record<string, ExerciseSet> = {
  count: [
    {
      kind: 'choice',
      prompt: 'How many blocks does this hand have?',
      position: { hands: ['123m45p79s99m456s2z'], dealer: 3, turn: 1 },
      options: ['Four', 'Five', 'Six'],
      answer: 1,
      claim: { shanten: 1 },
      why: '{123m}, {45p}, {79s}, {99m} and {456s}; the {2z} is a loose tile.',
    },
    {
      kind: 'choice',
      prompt: 'How many blocks does this hand have?',
      position: { hands: ['23m55p79p34s67s99m4z'], dealer: 3, turn: 1 },
      options: ['Four', 'Five', 'Six'],
      answer: 2,
      claim: { shanten: 3 },
      why: '{23m}, {55p}, {79p}, {34s}, {67s} and {99m}; the {4z} is a loose tile.',
    },
    {
      kind: 'choice',
      prompt: 'How many blocks does this hand have?',
      position: { hands: ['345p678s46m22p9m1s5z'], dealer: 3, turn: 1 },
      options: ['Four', 'Five', 'Six'],
      answer: 0,
      claim: { shanten: 2 },
      why: '{345p}, {678s}, {46m} and {22p}; {9m}, {1s} and {5z} are loose tiles.',
    },
  ],
  six: [
    {
      kind: 'discard',
      prompt: 'You drew {8s}: six blocks. Which discard keeps the most useful tiles?',
      position: { hands: ['45m99m234p79p34s67s'], dealer: 3, turn: 0, draws: '8s' },
      goal: 'max-ukeire',
      why: '{79p} is the only block weaker than two-sided.',
    },
    {
      kind: 'discard',
      prompt: 'You drew {8m}: six blocks. Which discard keeps the most useful tiles?',
      position: { hands: ['34m67m234p56p12s88s'], dealer: 3, turn: 0, draws: '8m' },
      goal: 'max-ukeire',
      why: '{12s} is the only edge shape; the others are two-sided or the pair.',
    },
    {
      kind: 'discard',
      prompt: 'You drew {6m}: six blocks, three of them pairs. Which discard keeps the most useful tiles?',
      position: { hands: ['45m22p77p345s67s99s'], dealer: 3, turn: 0, draws: '6m' },
      goal: 'max-ukeire',
      why: 'One pair is enough; break a third pair.',
    },
  ],
  four: [
    {
      kind: 'discard',
      prompt: 'You drew {1s}: four blocks and four loose tiles. Which discard keeps the most useful tiles?',
      position: { hands: ['234m678p99s45s1p6m9m'], dealer: 3, turn: 0, draws: '1s' },
      goal: 'max-ukeire',
      why: 'Keep {6m}, the tile most likely to become the fifth block; {9m} adds the least.',
    },
    {
      kind: 'discard',
      prompt: 'You drew {1m}: four blocks and four loose tiles. Which discard keeps the most useful tiles?',
      position: { hands: ['123p567s44m78m2s9p6p'], dealer: 3, turn: 0, draws: '1m' },
      goal: 'max-ukeire',
      why: 'Keep the middle tile {6p}; {9p} adds the fewest useful tiles.',
    },
    {
      kind: 'discard',
      prompt: 'You drew {9p}: four blocks and four loose tiles. Which discard keeps the most useful tiles?',
      position: { hands: ['234s666p45m88m2p7s1m'], dealer: 3, turn: 0, draws: '9p' },
      goal: 'max-ukeire',
      why: 'A 1 or 9 goes first, and {1m} adds the fewest useful tiles.',
    },
  ],
};
