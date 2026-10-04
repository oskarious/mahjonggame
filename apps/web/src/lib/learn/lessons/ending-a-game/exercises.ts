import type { Exercise } from '@mahjong/drills/types';

export const exercises: Record<string, Exercise> = {
  deals: {
    kind: 'choice',
    prompt: 'How many deals does an East-only game have at least?',
    options: ['4', '8', '16'],
    answer: 0,
    why: 'Each player deals once; repeats make it longer.',
  },
  uma: {
    kind: 'choice',
    prompt: 'With 15-5 uma, what does second place get added?',
    options: ['+15,000', '+5,000', 'Nothing'],
    answer: 1,
    why: 'First +15,000, second +5,000, third -5,000, fourth -15,000.',
  },
  bust: {
    kind: 'choice',
    prompt: 'On Riichi Arena a player drops below zero points. What happens?',
    options: ['The game ends', 'They keep playing in debt', 'They get points back'],
    answer: 0,
    why: 'Going bust ends the game at once.',
  },
};
