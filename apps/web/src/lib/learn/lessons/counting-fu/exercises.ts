import type { Exercise } from '@mahjong/drills/types';

export const exercises: Record<string, Exercise> = {
  closed: {
    kind: 'fu',
    expect: 40,
    prompt: 'You are in riichi and win by ron on {2p}. Build the fu.',
    position: {
      hands: ['999p123m456s77m13p'],
      riichi: [0],
      dealer: 3,
      turn: 2,
      draws: '2p',
      discard: true,
    },
    why: 'A closed wait and a concealed terminal triplet make this a 40 fu hand.',
  },
  open: {
    kind: 'fu',
    expect: 30,
    prompt: 'You called pon on white dragons and win by ron on {9s}. Build the fu.',
    position: {
      hands: ['234m678p11s99s'],
      melds: [[['pon', '555z']]],
      dealer: 3,
      turn: 1,
      draws: '9s',
      discard: true,
    },
    why: 'A triplet completed by ron counts as open.',
  },
  tsumo: {
    kind: 'fu',
    expect: 30,
    prompt: 'You draw {4s} and win. Build the fu.',
    position: {
      hands: ['111m456p789s55m23s'],
      dealer: 3,
      turn: 0,
      draws: '4s',
    },
    why: 'The triplet rules out pinfu, so the self-draw fu counts: 20 + 2 + 8 = 30.',
  },
  pinfu: {
    kind: 'choice',
    prompt: 'How many fu is pinfu won by self-draw?',
    options: ['20', '22', '30'],
    answer: 0,
    why: 'Pinfu tsumo is fixed at 20 fu: the self-draw fu is not added.',
  },
  pairs: {
    kind: 'choice',
    prompt: 'How many fu is seven pairs?',
    options: ['20', '25', '30'],
    answer: 1,
    why: 'Seven pairs is always 25 fu, never rounded.',
  },
  estimate: {
    kind: 'score',
    expect: '1 han 40 fu',
    prompt: 'A closed hand with all simples wins by ron on a closed wait. What is it worth?',
    position: { hands: ['234p567p456s88m46m'], dealer: 3, turn: 2, draws: '5m', discard: true },
    ask: 'han-fu',
    why: 'Closed, not pinfu, won by ron: about 40. Exactly: 20 + 10 for the closed ron + 2 for the wait, rounded up.',
  },
};
