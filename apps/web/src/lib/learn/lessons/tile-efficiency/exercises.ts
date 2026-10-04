import type { Exercise } from '@mahjong/drills/types';

export const exercises: Record<string, Exercise> = {
  count: {
    kind: 'pick',
    prompt: 'Tap every tile that would bring this hand closer to tenpai.',
    position: { hands: ['123s456s78p45p99m3z'], dealer: 3, turn: 1 },
    goal: 'ukeire',
    why: '{3p} and {6p} complete {45p}; {6p} and {9p} complete {78p}.',
  },
  honor: {
    kind: 'discard',
    prompt: 'You drew {6m}. Which discard keeps the most useful tiles?',
    position: { hands: ['123m456p78s99m1z9p4s'], dealer: 3, turn: 0, draws: '6m' },
    goal: 'max-ukeire',
    why: 'Four blocks so far: {9p}, {4s} and {6m} can each still grow into a fifth, {1z} only into a pair.',
  },
  spare: {
    kind: 'discard',
    prompt: 'You drew {6m}, and your hand has five blocks. Which loose tile goes?',
    position: { hands: ['24m57p35s99m123p9s4z'], dealer: 3, turn: 0, draws: '6m' },
    goal: 'judgment',
    only: '9s',
    why: '{9s} and {4z} keep the same tiles, but {4z} can be thrown safely if someone declares riichi later.',
  },
  shape: {
    kind: 'discard',
    prompt: 'You drew {9m}: six blocks, one too many. What goes?',
    position: { hands: ['12m46p678s45s99p78m'], dealer: 3, turn: 0, draws: '9m' },
    goal: 'judgment',
    only: '12m',
    why: 'Same count today, but {46p} can still become two-sided; {12m} never can.',
  },
};
