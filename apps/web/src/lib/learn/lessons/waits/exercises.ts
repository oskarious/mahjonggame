import type { ExerciseSet } from '../../context';

export const exercises: Record<string, ExerciseSet> = {
  kanchan: [
    {
      kind: 'pick',
      prompt: 'Which tile completes this hand?',
      position: { hands: ['123m456p789s55m35s'], dealer: 3, turn: 1 },
      goal: 'waits',
      why: 'A kanchan waits only for the middle tile: {4s}.',
    },
    {
      kind: 'pick',
      prompt: 'Which tile completes this hand?',
      position: { hands: ['234s678m111z46p99s'], dealer: 3, turn: 1 },
      goal: 'waits',
      why: 'A kanchan waits only for the middle tile: {5p}.',
    },
    {
      kind: 'pick',
      prompt: 'Which tile completes this hand?',
      position: { hands: ['79m345p22s123p678s'], dealer: 3, turn: 1 },
      goal: 'waits',
      why: 'A kanchan waits only for the middle tile: {8m}.',
    },
  ],
  shanpon: [
    {
      kind: 'pick',
      prompt: 'Two pairs: tap every tile that wins.',
      position: { hands: ['123m456p789s55m77s'], dealer: 3, turn: 1 },
      goal: 'waits',
      why: 'Either pair can become the triplet: {5m} or {7s}.',
    },
    {
      kind: 'pick',
      prompt: 'Two pairs: tap every tile that wins.',
      position: { hands: ['44s123m567s345p99p'], dealer: 3, turn: 1 },
      goal: 'waits',
      why: 'Either pair can become the triplet: {4s} or {9p}.',
    },
    {
      kind: 'pick',
      prompt: 'Two pairs: tap every tile that wins.',
      position: { hands: ['234m66p678s77z345s'], dealer: 3, turn: 1 },
      goal: 'waits',
      why: 'Either pair can become the triplet: {6p} or {7z}.',
    },
  ],
  nobetan: [
    {
      kind: 'pick',
      prompt: 'Four in a row: tap every tile that wins.',
      position: { hands: ['123m456p789m3456s'], dealer: 3, turn: 1 },
      goal: 'waits',
      why: '{345s} plus a lone {6s}, or a lone {3s} plus {456s}.',
    },
    {
      kind: 'pick',
      prompt: 'Four in a row: tap every tile that wins.',
      position: { hands: ['234m5678p678s111z'], dealer: 3, turn: 1 },
      goal: 'waits',
      why: '{567p} plus a lone {8p}, or a lone {5p} plus {678p}.',
    },
    {
      kind: 'pick',
      prompt: 'Four in a row: tap every tile that wins.',
      position: { hands: ['567p2345m123s999m'], dealer: 3, turn: 1 },
      goal: 'waits',
      why: '{234m} plus a lone {5m}, or a lone {2m} plus {345m}.',
    },
  ],
  three: [
    {
      kind: 'pick',
      prompt: 'Five in a row: tap every tile that wins.',
      position: { hands: ['123m456p23456s99s'], dealer: 3, turn: 1 },
      goal: 'waits',
      why: '{23s} plus {456s} waits on {1s} or {4s}; {234s} plus {56s} waits on {4s} or {7s}.',
    },
    {
      kind: 'pick',
      prompt: 'Five in a row: tap every tile that wins.',
      position: { hands: ['123s34567p789m22m'], dealer: 3, turn: 1 },
      goal: 'waits',
      why: '{34p} plus {567p} waits on {2p} or {5p}; {345p} plus {67p} waits on {5p} or {8p}.',
    },
    {
      kind: 'pick',
      prompt: 'Five in a row: tap every tile that wins.',
      position: { hands: ['234p11z45678m678s'], dealer: 3, turn: 1 },
      goal: 'waits',
      why: '{45m} plus {678m} waits on {3m} or {6m}; {456m} plus {78m} waits on {6m} or {9m}.',
    },
  ],
  tricky: [
    {
      kind: 'pick',
      prompt: 'Seven in a row: find every winning tile.',
      position: { hands: ['123m456p2345678s'], dealer: 3, turn: 1 },
      goal: 'waits',
      why: 'Split the seven tiles every way you can: {2s}, {5s} and {8s} all work.',
    },
    {
      kind: 'pick',
      prompt: 'Seven in a row: find every winning tile.',
      position: { hands: ['123s3456789p555m'], dealer: 3, turn: 1 },
      goal: 'waits',
      why: 'Split the seven tiles every way you can: {3p}, {6p} and {9p} all work.',
    },
    {
      kind: 'pick',
      prompt: 'Seven in a row: find every winning tile.',
      position: { hands: ['789p1234567m345s'], dealer: 3, turn: 1 },
      goal: 'waits',
      why: 'Split the seven tiles every way you can: {1m}, {4m} and {7m} all work.',
    },
  ],
};
