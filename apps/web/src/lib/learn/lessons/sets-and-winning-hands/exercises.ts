import type { ExerciseSet } from '../../context';

export const exercises: Record<string, ExerciseSet> = {
  finish: [
    {
      kind: 'pick',
      prompt: 'Which tiles turn {67s} into a sequence?',
      position: { hands: ['123m456p789s11z67s'], dealer: 3, turn: 1 },
      goal: 'waits',
      from: '4s5s8s9s',
      why: '{567s} or {678s}: a two-sided shape waits on both ends.',
    },
    {
      kind: 'pick',
      prompt: 'Which tiles turn {45p} into a sequence?',
      position: { hands: ['234m789s555s11z45p'], dealer: 3, turn: 1 },
      goal: 'waits',
      from: '2p3p6p7p',
      why: '{345p} or {456p}: a two-sided shape waits on both ends.',
    },
    {
      kind: 'pick',
      prompt: 'Which tiles turn {24s} into a sequence?',
      position: { hands: ['123m456p789m22z24s'], dealer: 3, turn: 1 },
      goal: 'waits',
      from: '1s3s5s6s',
      why: 'Only {234s}: a gap in the middle has one tile that fits.',
    },
  ],
  wrap: [
    {
      kind: 'choice',
      prompt: 'Is {891p} a sequence?',
      options: ['Yes', 'No'],
      answer: 1,
      why: 'Sequences never wrap around: 9 is the end of the suit.',
    },
    {
      kind: 'choice',
      prompt: 'Is {789s} a sequence?',
      options: ['Yes', 'No'],
      answer: 0,
      why: 'Three in a row that ends at 9: the end of the suit is fine, going past it is not.',
    },
    {
      kind: 'choice',
      prompt: 'Which one is a sequence?',
      options: ['{912p}', '{891p}', '{789p}'],
      answer: 2,
      why: 'Only {789p} stays inside 1 to 9; the others wrap around.',
    },
  ],
  winds: [
    {
      kind: 'choice',
      prompt: 'Can {123z} (East, South, West) be a set?',
      options: ['Yes', 'No'],
      answer: 1,
      why: 'Honors have no order, so they only make triplets and pairs.',
    },
    {
      kind: 'choice',
      prompt: 'Can {666z} be a set?',
      options: ['Yes', 'No'],
      answer: 0,
      why: 'Three of a kind is a triplet, the one set honors can make.',
    },
    {
      kind: 'choice',
      prompt: 'Can {567z} (white, green, red) be a set?',
      options: ['Yes', 'No'],
      answer: 1,
      why: 'Dragons have no order either: three different ones are not a set.',
    },
  ],
  incomplete: [
    {
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
    {
      kind: 'can-win',
      expect: 'not-complete',
      prompt: 'You drew {7p}. Is your hand complete?',
      position: {
        hands: ['234m789s555s11z45p'],
        dealer: 3,
        turn: 0,
        draws: '7p',
      },
      why: '{457p} is not a sequence: you need {3p} or {6p}.',
    },
    {
      kind: 'can-win',
      expect: 'yes',
      prompt: 'You drew {2p}. Is your hand complete?',
      position: {
        hands: ['777p678m345s99s13p'],
        dealer: 3,
        turn: 0,
        draws: '2p',
      },
      why: '{123p} is the fourth set and {99s} the pair.',
    },
  ],
  pairs: [
    {
      kind: 'can-win',
      expect: 'yes',
      prompt: 'You drew {7z}. Can you win with seven pairs?',
      position: { hands: ['1133m5577p2266s7z'], dealer: 3, turn: 0, draws: '7z' },
      why: 'Seven different pairs is a winning hand of its own.',
    },
    {
      kind: 'can-win',
      expect: 'yes',
      prompt: 'You drew {8s}. Can you win with seven pairs?',
      position: { hands: ['2244p668s1199m55z'], dealer: 3, turn: 0, draws: '8s' },
      why: 'Seven different pairs, honors included: a winning hand.',
    },
    {
      kind: 'can-win',
      expect: 'not-complete',
      prompt: 'You drew {5m}. Can you win with seven pairs?',
      position: { hands: ['11m555m33p99p44s88s'], dealer: 3, turn: 0, draws: '5m' },
      why: 'Four {5m} are not two pairs: the seven pairs must all be different.',
    },
  ],
};
