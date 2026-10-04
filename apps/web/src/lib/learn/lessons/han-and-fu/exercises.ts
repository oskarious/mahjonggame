import type { Exercise } from '@mahjong/drills/types';

export const exercises: Record<string, Exercise> = {
  count: {
    kind: 'score',
    expect: '3 han',
    prompt: 'You are in riichi and win by ron on {4s}. How many han is the hand worth?',
    position: {
      hands: ['234m456p678s55m23s'],
      riichi: [0],
      dealer: 3,
      turn: 2,
      draws: '4s',
      discard: true,
    },
    ask: 'han',
    why: 'With no dora, the han are just the yaku added up. Keep the 30 fu for the next step.',
  },
  points: {
    kind: 'score',
    show: { seat: true },
    expect: '3900',
    prompt: 'Same hand, 3 han and 30 fu: how many points does the discarder pay?',
    position: {
      hands: ['234m456p678s55m23s'],
      riichi: [0],
      dealer: 3,
      turn: 2,
      draws: '4s',
      discard: true,
    },
    ask: 'points',
    why: '3 han 30 fu for a non-dealer is 3900.',
  },
  dealer: {
    kind: 'score',
    show: { seat: true },
    expect: '1300 all',
    prompt: 'You are the dealer and win by self-draw with 2 han and 40 fu. What does each player pay?',
    position: {
      hands: ['555z123m456p78s99s'],
      dealer: 0,
      turn: 0,
      draws: '9s',
    },
    ask: 'points',
    why: 'Dealer self-draw, 2 han 40 fu: 1300 from each player.',
  },
  mangan: {
    kind: 'choice',
    prompt: 'What is a non-dealer 4 han 40 fu hand worth?',
    options: ['5200', '7700', '8000 (mangan)'],
    answer: 2,
    why: 'Above 2000 base points the score is capped at a mangan.',
  },
  haneman: {
    kind: 'choice',
    prompt: 'A non-dealer wins a 6 han hand by ron. How much?',
    options: ['8000', '12000', '16000'],
    answer: 1,
    why: '6 and 7 han are a haneman: one and a half mangan.',
  },
};
