import type { Exercise } from '@mahjong/drills/types';

export const exercises: Record<string, Exercise> = {
  reasons: {
    kind: 'choice',
    prompt: 'You are in tenpai, and not the dealer. Riichi or dama?',
    position: { hands: ['123m456p789s67s99m'], dealer: 3, turn: 1 },
    options: ['Riichi', 'Dama'],
    answer: 0,
    claim: { tenpai: true, goodWait: true, minRon: 1000 },
    why: 'A two-sided wait and pinfu: two reasons. Riichi turns 1000 into 2000 or more.',
  },
  now: {
    kind: 'choice',
    prompt: 'You just reached tenpai on a closed wait. Riichi now, or wait for a better shape?',
    position: { hands: ['234p567p456s88m46m'], dealer: 3, turn: 1 },
    options: ['Riichi now', 'Wait for a better shape'],
    answer: 0,
    claim: { tenpai: true, goodWait: false, minRon: 1300 },
    why: 'All simples is a han besides riichi, and the tiles that would improve the wait are few.',
  },
  value: {
    kind: 'discard',
    prompt: 'You drew {6s}, and the dora is {3s}. Which discard for riichi?',
    position: { hands: ['111m456p789p99m35s'], dealer: 3, turn: 0, draws: '6s', dora: '2s' },
    goal: 'judgment',
    only: '6s',
    show: { dora: true },
    why: 'Dropping the dora waits two-sided for 1300; keeping it waits on {4s} for 2600.',
  },
  dama: {
    kind: 'choice',
    prompt: 'Late in the hand, this hand wins 8000 without riichi. Riichi or dama?',
    position: { hands: ['234m234p234s67s88p'], dealer: 3, turn: 1 },
    options: ['Riichi', 'Dama'],
    answer: 1,
    claim: { tenpai: true, minRon: 8000 },
    why: 'Riichi would add little to a mangan, but warns everyone and locks your hand.',
  },
};
