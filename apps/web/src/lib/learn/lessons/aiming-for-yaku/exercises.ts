import type { ExerciseSet } from '../../context';

export const exercises: Record<string, ExerciseSet> = {
  straight: [
    {
      kind: 'discard',
      prompt: 'You drew {4s}: six blocks. Which block goes?',
      position: { hands: ['123m456m89m46p99s3s'], dealer: 3, turn: 0, draws: '4s' },
      goal: 'judgment',
      only: '46p',
      why: 'Both weak shapes keep the same tiles, but {89m} can finish a pure straight with {7m}: 2 han.',
    },
    {
      kind: 'discard',
      prompt: 'You drew {5m}: six blocks. Which block goes?',
      position: { hands: ['123s456s79s68p99m4m'], dealer: 3, turn: 0, draws: '5m' },
      goal: 'judgment',
      only: '68p',
      why: 'Both closed shapes keep the same tiles, but {79s} can finish a pure straight with {8s}: 2 han.',
    },
    {
      kind: 'discard',
      prompt: 'You drew {7m}: six blocks. Which block goes?',
      position: { hands: ['456p789p12p89s33m6m'], dealer: 3, turn: 0, draws: '7m' },
      goal: 'judgment',
      only: '89s',
      why: 'Both edge shapes keep the same tiles, but {12p} can finish a pure straight with {3p}: 2 han.',
    },
  ],
  pairs: [
    {
      kind: 'discard',
      prompt: 'You drew {9p}, and hold five pairs. Which discard keeps you closest to winning?',
      position: { hands: ['11m44m77p22s66s3z5p9s'], dealer: 3, turn: 0, draws: '9p' },
      goal: 'min-shanten',
      why: 'Five pairs is one tile from tenpai on seven pairs: any loose tile can go.',
    },
    {
      kind: 'discard',
      prompt: 'You drew {6m}, and hold five pairs. Which discard keeps you closest to winning?',
      position: { hands: ['33p88p11s55m99m2z7s4p'], dealer: 3, turn: 0, draws: '6m' },
      goal: 'min-shanten',
      why: 'Five pairs is one tile from tenpai on seven pairs: any loose tile can go.',
    },
    {
      kind: 'discard',
      prompt: 'You drew {5s}, and hold five pairs. Which discard keeps you closest to winning?',
      position: { hands: ['22p77s44m88m66p1z3s9p'], dealer: 3, turn: 0, draws: '5s' },
      goal: 'min-shanten',
      why: 'Five pairs is one tile from tenpai on seven pairs: any loose tile can go.',
    },
  ],
  flush: [
    {
      kind: 'choice',
      prompt: 'When is chasing a half flush worth the lost speed?',
      options: ['When it is your only yaku', 'When it lifts a cheap hand to mangan', 'Whenever it is possible'],
      answer: 1,
      why: 'Each han roughly doubles a small hand, so 3 more han matter most there.',
    },
    {
      kind: 'choice',
      prompt: 'Your closed hand is already a mangan with riichi and dora. Should you slow it down for a half flush?',
      options: ['No, take the fast tenpai', 'Yes, more han is always better'],
      answer: 0,
      why: 'Above mangan each han adds far less than below it, so the speed is worth more.',
    },
    {
      kind: 'choice',
      prompt:
        'Your closed hand has a dragon triplet and one dora, and could become a half flush. Is it worth the lost speed?',
      options: ['No, it already has a yaku', 'Yes, it reaches mangan'],
      answer: 1,
      why: 'Dragon, dora and a closed half flush make 5 han: a mangan instead of 2 han.',
    },
  ],
};
