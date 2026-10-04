import type { ExerciseSet } from '../../context';

export const exercises: Record<string, ExerciseSet> = {
  count: [
    {
      kind: 'pick',
      prompt: 'Tap every tile that would bring this hand closer to tenpai.',
      position: { hands: ['123s456s78p45p99m3z'], dealer: 3, turn: 1 },
      goal: 'ukeire',
      why: '{3p} and {6p} complete {45p}; {6p} and {9p} complete {78p}.',
    },
    {
      kind: 'pick',
      prompt: 'Tap every tile that would bring this hand closer to tenpai.',
      position: { hands: ['345m678p23s56s44p1z'], dealer: 3, turn: 1 },
      goal: 'ukeire',
      why: '{1s} and {4s} complete {23s}; {4s} and {7s} complete {56s}.',
    },
    {
      kind: 'pick',
      prompt: 'Tap every tile that would bring this hand closer to tenpai.',
      position: { hands: ['789s123m24p67m55s6z'], dealer: 3, turn: 1 },
      goal: 'ukeire',
      why: '{3p} fills {24p}; {5m} and {8m} complete {67m}.',
    },
  ],
  honor: [
    {
      kind: 'discard',
      prompt: 'You drew {6m}. Which discard keeps the most useful tiles?',
      position: { hands: ['123m456p78s99m1z9p4s'], dealer: 3, turn: 0, draws: '6m' },
      goal: 'max-ukeire',
      why: 'Four blocks so far: {9p}, {4s} and {6m} can each still grow into a fifth, {1z} only into a pair.',
    },
    {
      kind: 'discard',
      prompt: 'You drew {2m}. Which discard keeps the most useful tiles?',
      position: { hands: ['234s567m45p11s2z1p8s'], dealer: 3, turn: 0, draws: '2m' },
      goal: 'max-ukeire',
      only: '2z',
      why: 'Four blocks so far: {1p}, {8s} and {2m} can each still grow into a fifth, {2z} only into a pair.',
    },
    {
      kind: 'discard',
      prompt: 'You drew {9p}. Which discard keeps the most useful tiles?',
      position: { hands: ['345p789m23s66p6z9s3m'], dealer: 3, turn: 0, draws: '9p' },
      goal: 'max-ukeire',
      only: '6z',
      why: 'Four blocks so far: {9p}, {9s} and {3m} can each still grow into a fifth, {6z} only into a pair.',
    },
  ],
  spare: [
    {
      kind: 'discard',
      prompt: 'You drew {6m}, and your hand has five blocks. Which loose tile goes?',
      position: { hands: ['24m57p35s99m123p9s4z'], dealer: 3, turn: 0, draws: '6m' },
      goal: 'judgment',
      only: '9s',
      why: '{9s} and {4z} keep the same tiles, but {4z} can be thrown safely if someone declares riichi later.',
    },
    {
      kind: 'discard',
      prompt: 'You drew {7m}, and your hand has five blocks. Which loose tile goes?',
      position: { hands: ['456p35m68s22p13s9p2z'], dealer: 3, turn: 0, draws: '7m' },
      goal: 'judgment',
      only: '9p',
      why: '{9p} and {2z} keep the same tiles, but {2z} can be thrown safely if someone declares riichi later.',
    },
    {
      kind: 'discard',
      prompt: 'You drew {3p}, and your hand has five blocks. Which loose tile goes?',
      position: { hands: ['57s24p11m345m78p1s7z'], dealer: 3, turn: 0, draws: '3p' },
      goal: 'judgment',
      only: '1s',
      why: '{1s} and {7z} keep the same tiles, but {7z} can be thrown safely if someone declares riichi later.',
    },
  ],
  shape: [
    {
      kind: 'discard',
      prompt: 'You drew {9m}: six blocks, one too many. What goes?',
      position: { hands: ['12m46p678s45s99p78m'], dealer: 3, turn: 0, draws: '9m' },
      goal: 'judgment',
      only: '12m',
      why: 'Same count today, but {46p} can still become two-sided; {12m} never can.',
    },
    {
      kind: 'discard',
      prompt: 'You drew {5m}: six blocks, one too many. What goes?',
      position: { hands: ['89m24s123p67p11z34m'], dealer: 3, turn: 0, draws: '5m' },
      goal: 'judgment',
      only: '89m',
      why: 'Same count today, but {24s} can still become two-sided; {89m} never can.',
    },
    {
      kind: 'discard',
      prompt: 'You drew {8p}: six blocks, one too many. What goes?',
      position: { hands: ['12p57s789m34m33z67p'], dealer: 3, turn: 0, draws: '8p' },
      goal: 'judgment',
      only: '12p',
      why: 'Same count today, but {57s} can still become two-sided; {12p} never can.',
    },
  ],
};
