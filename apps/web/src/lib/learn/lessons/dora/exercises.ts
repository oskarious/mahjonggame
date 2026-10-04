import type { ExerciseSet } from '../../context';

export const exercises: Record<string, ExerciseSet> = {
  wrap: [
    {
      kind: 'pick',
      prompt: 'The indicator is {9p}. Tap the dora.',
      position: { hands: ['234m456p678s55m23s'], dealer: 3, turn: 1, dora: '9p' },
      goal: 'dora',
      why: 'After 9 comes 1 again: the dora is {1p}.',
    },
    {
      kind: 'pick',
      prompt: 'The indicator is {4m}. Tap the dora.',
      position: { hands: ['345p678s22m34m789s'], dealer: 3, turn: 1, dora: '4m' },
      goal: 'dora',
      why: 'The tile after the indicator: the dora is {5m}.',
    },
    {
      kind: 'pick',
      prompt: 'The indicator is {9s}. Tap the dora.',
      position: { hands: ['123s567m44p678p23m'], dealer: 3, turn: 1, dora: '9s' },
      goal: 'dora',
      why: 'After 9 comes 1 again: the dora is {1s}.',
    },
  ],
  wind: [
    {
      kind: 'pick',
      prompt: 'The indicator is {4z} (North). Tap the dora.',
      position: { hands: ['234m456p678s55m23s'], dealer: 3, turn: 1, dora: '4z' },
      goal: 'dora',
      why: 'Winds go East, South, West, North, then back to East.',
    },
    {
      kind: 'pick',
      prompt: 'The indicator is {1z} (East). Tap the dora.',
      position: { hands: ['345p678s22m34m789s'], dealer: 3, turn: 1, dora: '1z' },
      goal: 'dora',
      why: 'After East comes South.',
    },
    {
      kind: 'pick',
      prompt: 'The indicator is {2z} (South). Tap the dora.',
      position: { hands: ['123s567m44p678p23m'], dealer: 3, turn: 1, dora: '2z' },
      goal: 'dora',
      why: 'After South comes West.',
    },
  ],
  dragon: [
    {
      kind: 'pick',
      prompt: 'The indicator is {7z} (red dragon). Tap the dora.',
      position: { hands: ['234m456p678s55m23s'], dealer: 3, turn: 1, dora: '7z' },
      goal: 'dora',
      why: 'Dragons go white, green, red, then back to white.',
    },
    {
      kind: 'pick',
      prompt: 'The indicator is {5z} (white dragon). Tap the dora.',
      position: { hands: ['345p678s22m34m789s'], dealer: 3, turn: 1, dora: '5z' },
      goal: 'dora',
      why: 'After white comes green.',
    },
    {
      kind: 'pick',
      prompt: 'The indicator is {6z} (green dragon). Tap the dora.',
      position: { hands: ['123s567m44p678p23m'], dealer: 3, turn: 1, dora: '6z' },
      goal: 'dora',
      why: 'After green comes red.',
    },
  ],
  kan: [
    {
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
    {
      kind: 'pick',
      prompt: 'After a kan there are two indicators. Tap both dora.',
      position: {
        hands: ['234m678p44s56s'],
        melds: [[['ankan', '9999p']]],
        dealer: 3,
        turn: 1,
        dora: '9m2z',
      },
      goal: 'dora',
      why: 'Each indicator makes its own dora: {1m} and {3z}.',
    },
    {
      kind: 'pick',
      prompt: 'After a kan there are two indicators. Tap both dora.',
      position: {
        hands: ['345m123s77p78s'],
        melds: [[['ankan', '2222p']]],
        dealer: 3,
        turn: 1,
        dora: '7z8p',
      },
      goal: 'dora',
      why: 'Each indicator makes its own dora: {5z} and {9p}.',
    },
  ],
  han: [
    {
      kind: 'choice',
      prompt: 'A hand wins with riichi, all simples and two dora. How many han?',
      options: ['2', '3', '4'],
      answer: 2,
      why: 'Two yaku of 1 han each, plus 1 han per dora.',
    },
    {
      kind: 'choice',
      prompt: 'A closed hand wins by self-draw with pinfu and a red five. How many han?',
      options: ['2', '3', '4'],
      answer: 1,
      why: 'Pinfu and self-draw are 1 han each, and the red five adds 1.',
    },
    {
      kind: 'choice',
      prompt: 'A hand has three dora but no yaku. Can it win?',
      options: ['Yes, with 3 han', 'No'],
      answer: 1,
      why: 'Dora add han to a hand with a yaku; on their own they are not one.',
    },
  ],
};
