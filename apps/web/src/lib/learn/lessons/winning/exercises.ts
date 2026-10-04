import type { Exercise } from '../../types';

export const exercises: Record<string, Exercise> = {
  tsumo: {
    kind: 'can-win',
    expect: 'yes',
    prompt: 'You drew {4s}. Can you win?',
    position: {
      hands: ['123m456p789s11z23s'],
      dealer: 3,
      turn: 0,
      draws: '4s',
    },
    why: 'Self-draw with a closed hand is a yaku by itself.',
  },
  ron: {
    kind: 'can-win',
    expect: 'no-yaku',
    prompt: 'Same hand, but the player across discards {4s}. Can you win?',
    position: {
      hands: ['123m456p789s11z23s'],
      dealer: 3,
      turn: 2,
      draws: '4s',
      discard: true,
    },
    why: 'By ron this closed hand has no yaku: no riichi, no simples-only, no value triplet.',
  },
  riichi: {
    kind: 'can-win',
    expect: 'yes',
    prompt: 'You declared riichi with that hand, and the player across discards {4s}. Can you win?',
    position: {
      hands: ['123m456p789s11z23s'],
      dealer: 3,
      riichi: [0],
      turn: 2,
      draws: '4s',
      discard: true,
    },
    why: 'Riichi is a yaku, so any closed tenpai hand with riichi can win.',
  },
  simples: {
    kind: 'can-win',
    expect: 'yes',
    prompt: 'A closed hand of only tiles 2 to 8, no riichi, and the player across discards {3s}. Can you win?',
    position: {
      hands: ['234m456p678s55m33s'],
      dealer: 3,
      turn: 2,
      draws: '3s',
      discard: true,
    },
    why: 'All simples is the yaku: no riichi or self-draw needed.',
  },
  open: {
    kind: 'can-win',
    expect: 'yes',
    prompt: 'You called pon on green dragons, and now {9s} is discarded. Can you win?',
    position: {
      hands: ['123m456p78s99s'],
      melds: [[['pon', '666z']]],
      dealer: 3,
      turn: 1,
      draws: '9s',
      discard: true,
    },
    why: 'The dragon triplet is the yaku.',
  },
  dora: {
    kind: 'choice',
    prompt: 'A complete hand has three dora and no yaku. Can it win?',
    options: ['Yes', 'No'],
    answer: 1,
    why: 'Dora only add value to a hand that already has a yaku.',
  },
};
