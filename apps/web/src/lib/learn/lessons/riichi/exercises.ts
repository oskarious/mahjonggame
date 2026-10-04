import type { Exercise } from '../../types';

export const exercises: Record<string, Exercise> = {
  declare: {
    kind: 'discard',
    prompt: 'You drew {3z}. Discard for riichi with the most winning tiles.',
    position: { hands: ['123m456p789p5678s'], dealer: 3, turn: 0, draws: '3z' },
    goal: 'max-ukeire',
    why: 'Dropping {3z} keeps {5678s} waiting on {5s} or {8s}; any other tenpai discard leaves a single wait on {3z}.',
  },
  open: {
    kind: 'choice',
    prompt: 'You called pon earlier this hand. Can you declare riichi?',
    options: ['Yes', 'No'],
    answer: 1,
    why: 'Riichi needs a closed hand.',
  },
  locked: {
    kind: 'choice',
    prompt: 'After riichi you draw a tile that would give you a better wait. What can you do?',
    options: ['Keep it and change the wait', 'Discard it', 'Cancel the riichi'],
    answer: 1,
    why: 'After riichi you discard every tile you draw unless it wins.',
  },
  win: {
    kind: 'yaku',
    expect: ['riichi', 'menzenTsumo', 'pinfu'],
    prompt: 'You are in riichi and draw {1s}. Tap every yaku.',
    position: {
      hands: ['234m567p789s99s23s'],
      riichi: [0],
      dealer: 3,
      turn: 0,
      draws: '1s',
    },
    why: 'Riichi, self-draw and pinfu all stack.',
  },
};
