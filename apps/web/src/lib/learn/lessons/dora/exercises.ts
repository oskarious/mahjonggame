import type { Exercise } from '@mahjong/drills/types';

export const exercises: Record<string, Exercise> = {
  wrap: {
    kind: 'pick',
    prompt: 'The indicator is {9p}. Tap the dora.',
    position: { hands: ['234m456p678s55m23s'], dealer: 3, turn: 1, dora: '9p' },
    goal: 'dora',
    why: 'After 9 comes 1 again: the dora is {1p}.',
  },
  wind: {
    kind: 'pick',
    prompt: 'The indicator is {4z} (North). Tap the dora.',
    position: { hands: ['234m456p678s55m23s'], dealer: 3, turn: 1, dora: '4z' },
    goal: 'dora',
    why: 'Winds go East, South, West, North, then back to East.',
  },
  dragon: {
    kind: 'pick',
    prompt: 'The indicator is {7z} (red dragon). Tap the dora.',
    position: { hands: ['234m456p678s55m23s'], dealer: 3, turn: 1, dora: '7z' },
    goal: 'dora',
    why: 'Dragons go white, green, red, then back to white.',
  },
  kan: {
    kind: 'pick',
    prompt: 'After a kan there are two indicators. Tap both dora.',
    position: {
      hands: ['456p789s55m23s'],
      melds: [[['ankan', '1111m']]],
      dealer: 3,
      turn: 1,
      dora: '3p5s',
    },
    goal: 'dora',
    why: 'Each indicator makes its own dora: {4p} and {6s}.',
  },
  han: {
    kind: 'choice',
    prompt: 'A hand wins with riichi, all simples and two dora. How many han?',
    options: ['2', '3', '4'],
    answer: 2,
    why: 'Two yaku of 1 han each, plus 1 han per dora.',
  },
};
