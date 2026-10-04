import type { Exercise } from '@mahjong/drills/types';

export const exercises: Record<string, Exercise> = {
  straight: {
    kind: 'discard',
    prompt: 'You drew {4s}: six blocks. Which block goes?',
    position: { hands: ['123m456m89m46p99s3s'], dealer: 3, turn: 0, draws: '4s' },
    goal: 'judgment',
    only: '46p',
    why: 'Both weak shapes keep the same tiles, but {89m} can finish a pure straight with {7m}: 2 han.',
  },
  pairs: {
    kind: 'discard',
    prompt: 'You drew {9p}, and hold five pairs. Which discard keeps you closest to winning?',
    position: { hands: ['11m44m77p22s66s3z5p9s'], dealer: 3, turn: 0, draws: '9p' },
    goal: 'min-shanten',
    why: 'Five pairs is one tile from tenpai on seven pairs: any loose tile can go.',
  },
  flush: {
    kind: 'choice',
    prompt: 'When is chasing a half flush worth the lost speed?',
    options: ['When it is your only yaku', 'When it lifts a cheap hand to mangan', 'Whenever it is possible'],
    answer: 1,
    why: 'Each han roughly doubles a small hand, so 3 more han matter most there.',
  },
};
