import type { ExerciseSet } from '../../context';

export const exercises: Record<string, ExerciseSet> = {
  first: [
    {
      kind: 'discard',
      prompt: 'You drew {6m}: one shape too many. Which discard keeps the most useful tiles?',
      position: { hands: ['23m57p345s67s88p45m'], dealer: 3, turn: 0, draws: '6m' },
      goal: 'max-ukeire',
      why: 'Breaking the closed {57p} keeps both two-sided shapes, {23456m} and {67s}.',
    },
    {
      kind: 'discard',
      prompt: 'You drew {8s}: one shape too many. Which discard keeps the most useful tiles?',
      position: { hands: ['45s67s68m789p34p22m'], dealer: 3, turn: 0, draws: '8s' },
      goal: 'max-ukeire',
      why: 'Breaking the closed {68m} keeps both two-sided shapes, {45678s} and {34p}.',
    },
    {
      kind: 'discard',
      prompt: 'You drew {2p}: one shape too many. Which discard keeps the most useful tiles?',
      position: { hands: ['34p56p79s456m23s11z'], dealer: 3, turn: 0, draws: '2p' },
      goal: 'max-ukeire',
      why: 'Breaking the closed {79s} keeps both two-sided shapes, {23456p} and {23s}.',
    },
  ],
  row: [
    {
      kind: 'pick',
      prompt: 'Tap every tile that would bring this hand closer to tenpai.',
      position: { hands: ['123m789p99m3456s4z'], dealer: 3, turn: 1 },
      goal: 'ukeire',
      why: '{3456s} alone accepts every bamboo tile from 1 to 8.',
    },
    {
      kind: 'pick',
      prompt: 'Tap every tile that would bring this hand closer to tenpai.',
      position: { hands: ['789m345s66z5678p2z'], dealer: 3, turn: 1 },
      goal: 'ukeire',
      why: '{5678p} alone accepts every circle from 3 to 9.',
    },
    {
      kind: 'pick',
      prompt: 'Tap every tile that would bring this hand closer to tenpai.',
      position: { hands: ['234s678p11z2345m6z'], dealer: 3, turn: 1 },
      goal: 'ukeire',
      why: '{2345m} alone accepts every character from 1 to 7.',
    },
  ],
  pairs: [
    {
      kind: 'discard',
      prompt: 'You drew {6m}, and you hold three pairs. Which discard keeps the most useful tiles?',
      position: { hands: ['22m99p88s45m67p123s'], dealer: 3, turn: 0, draws: '6m' },
      goal: 'max-ukeire',
      why: 'Breaking a pair keeps the two-sided {67p}: it accepts 8 tiles, the third pair only 2.',
    },
    {
      kind: 'discard',
      prompt: 'You drew {6p}, and you hold three pairs. Which discard keeps the most useful tiles?',
      position: { hands: ['55z22p88s67m345s45p'], dealer: 3, turn: 0, draws: '6p' },
      goal: 'max-ukeire',
      why: 'Breaking a pair keeps the two-sided {67m}: it accepts 8 tiles, the third pair only 2.',
    },
    {
      kind: 'discard',
      prompt: 'You drew {5p}, and you hold three pairs. Which discard keeps the most useful tiles?',
      position: { hands: ['44m99p22s67s789m34p'], dealer: 3, turn: 0, draws: '5p' },
      goal: 'max-ukeire',
      why: 'Breaking a pair keeps the two-sided {67s}: it accepts 8 tiles, the third pair only 2.',
    },
  ],
  good: [
    {
      kind: 'discard',
      prompt: 'You drew {8p}. Which discard gives the best chance of a two-sided wait?',
      position: { hands: ['12m45m78m11p234p67p'], dealer: 3, turn: 0, draws: '8p' },
      goal: 'max-good-wait',
      why: 'Cutting the edge {12m} keeps {45m} and {78m}: whatever comes, you wait two-sided.',
    },
    {
      kind: 'discard',
      prompt: 'You drew {6m}. Which discard gives the best chance of a two-sided wait?',
      position: { hands: ['89s56s23s99p345m78m'], dealer: 3, turn: 0, draws: '6m' },
      goal: 'max-good-wait',
      why: 'Cutting the edge {89s} keeps {23s} and {56s}: whatever comes, you wait two-sided.',
    },
    {
      kind: 'discard',
      prompt: 'You drew {9s}. Which discard gives the best chance of a two-sided wait?',
      position: { hands: ['12s34p67p55z111m78s'], dealer: 3, turn: 0, draws: '9s' },
      goal: 'max-good-wait',
      why: 'Cutting the edge {12s} keeps {34p} and {67p}: whatever comes, you wait two-sided.',
    },
  ],
};
