import type { Exercise } from '@mahjong/drills/types';

export const exercises: Record<string, Exercise> = {
  first: {
    kind: 'discard',
    prompt: 'You drew {6m}: one shape too many. Which discard keeps the most useful tiles?',
    position: { hands: ['23m57p345s67s88p45m'], dealer: 3, turn: 0, draws: '6m' },
    goal: 'max-ukeire',
    why: 'Breaking the closed {57p} keeps both two-sided shapes, {23456m} and {67s}.',
  },
  row: {
    kind: 'pick',
    prompt: 'Tap every tile that would bring this hand closer to tenpai.',
    position: { hands: ['123m789p99m3456s4z'], dealer: 3, turn: 1 },
    goal: 'ukeire',
    why: '{3456s} alone accepts every bamboo tile from 1 to 8.',
  },
  pairs: {
    kind: 'discard',
    prompt: 'You drew {6m}, and you hold three pairs. Which discard keeps the most useful tiles?',
    position: { hands: ['22m99p88s45m67p123s'], dealer: 3, turn: 0, draws: '6m' },
    goal: 'max-ukeire',
    why: 'Breaking a pair keeps the two-sided {67p}: it accepts 8 tiles, the third pair only 2.',
  },
  good: {
    kind: 'discard',
    prompt: 'You drew {8p}. Which discard gives the best chance of a two-sided wait?',
    position: { hands: ['12m45m78m11p234p67p'], dealer: 3, turn: 0, draws: '8p' },
    goal: 'max-good-wait',
    why: 'Cutting the edge {12m} keeps {45m} and {78m}: whatever comes, you wait two-sided.',
  },
};
