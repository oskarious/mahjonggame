import type { Exercise } from '../../types';

export const exercises: Record<string, Exercise> = {
  own: {
    kind: 'can-win',
    expect: 'furiten',
    prompt:
      'You wait on {1s} or {4s} and discarded a {4s} earlier. The player on your right discards {4s}: can you win?',
    position: {
      hands: ['234m567p789s99s23s'],
      discards: ['4s'],
      dealer: 3,
      turn: 1,
      draws: '4s',
      discard: true,
    },
    show: { ponds: [0] },
    why: 'Your own {4s} is in your river.',
  },
  whole: {
    kind: 'can-win',
    expect: 'furiten',
    prompt: 'Same hand and discards, but now {1s} is discarded. Can you win?',
    position: {
      hands: ['234m567p789s99s23s'],
      discards: ['4s'],
      dealer: 3,
      turn: 2,
      draws: '1s',
      discard: true,
    },
    show: { ponds: [0] },
    why: 'Furiten covers every tile you wait on, not only the one you discarded.',
  },
  tsumo: {
    kind: 'can-win',
    expect: 'yes',
    prompt: 'Same hand and discards, and you draw {1s} yourself. Can you win?',
    position: {
      hands: ['234m567p789s99s23s'],
      discards: ['4s'],
      dealer: 3,
      turn: 0,
      draws: '1s',
    },
    show: { ponds: [0] },
    why: 'Furiten only stops ron. Self-draw still wins.',
  },
  avoid: {
    kind: 'discard',
    prompt: 'You drew {5s}. Reach tenpai without being furiten.',
    position: {
      hands: ['234m567p789s99s23s'],
      discards: ['1s'],
      dealer: 3,
      turn: 0,
      draws: '5s',
    },
    goal: 'tenpai',
    only: '2s',
    show: { ponds: [0] },
    why: 'Keeping {35s} waits on {4s}, which is not in your river.',
  },
  temporary: {
    kind: 'choice',
    prompt: 'You pass on a ron because the hand is cheap. When can you ron again?',
    options: ['Right away', 'After your next discard', 'Never this hand'],
    answer: 1,
    why: 'Passing makes you temporarily furiten until your own next discard.',
  },
};
