import type { Exercise } from '../../types';

export const exercises: Record<string, Exercise> = {
  fold: {
    kind: 'choice',
    prompt: 'The player across declared riichi. You are in tenpai on a closed wait, for 1300: push or fold?',
    position: { hands: ['345m678p234s66p57s'], discards: [undefined, undefined, '9m1z'], riichi: [2], dealer: 3, turn: 1 },
    options: ['Push', 'Fold'],
    answer: 1,
    claim: { tenpai: true, goodWait: false, minRon: 1300 },
    why: 'Tenpai, but cheap and on a bad wait: two of three say fold.',
  },
  push: {
    kind: 'choice',
    prompt: 'The player across declared riichi. You are in tenpai on a two-sided wait, for 2000: push or fold?',
    position: { hands: ['234m567m45p678s22s'], discards: [undefined, undefined, '9m1z'], riichi: [2], dealer: 3, turn: 1 },
    options: ['Push', 'Fold'],
    answer: 0,
    claim: { tenpai: true, goodWait: true, minRon: 2000 },
    why: 'Cheap, but in tenpai with a good wait: two of three say push.',
  },
  ladder: {
    kind: 'discard',
    prompt: 'The player across declared riichi. Nothing in your hand is genbutsu: discard the safest tile.',
    position: {
      hands: ['123m678p789s1p5p1z3z'],
      discards: [undefined, undefined, '4p2z'],
      riichi: [2],
      dealer: 3,
      turn: 0,
      draws: '8p',
    },
    goal: { safest: 2 },
    show: { ponds: [2] },
    why: '{1p} is suji of their {4p}, and a terminal: only a pair-based wait can still hit it.',
  },
  nothing: {
    kind: 'choice',
    prompt: 'You are folding, and nothing in your hand is genbutsu or suji. Which is usually safer?',
    options: ['A {9s} nobody has discarded', 'A {5s} nobody has discarded'],
    answer: 0,
    why: 'A {5s} fits more waits than a {9s}: two-sided waits from both sides, and closed waits too.',
  },
};
