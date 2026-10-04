import type { Exercise } from '../../types';

export const exercises: Record<string, Exercise> = {
  safe: {
    kind: 'discard',
    prompt: 'The player across declared riichi. Discard a tile they cannot win on.',
    position: {
      hands: ['23m456p789s55m3z6s1p'],
      discards: [undefined, undefined, '9m4p6s2z1z8m'],
      riichi: [2],
      dealer: 3,
      turn: 0,
      draws: '8p',
    },
    goal: { safeAgainst: 2 },
    show: { ponds: [2] },
    why: 'Tiles in the riichi player’s own river are completely safe against them.',
  },
  suji: {
    kind: 'choice',
    prompt: 'A riichi player discarded {4p}. Which tile is suji, safe from a two-sided wait?',
    options: ['{1p}', '{2p}', '{3p}'],
    answer: 0,
    why: 'A two-sided wait on {1p} would also wait on {4p}, which would make them furiten.',
  },
  fold: {
    kind: 'choice',
    prompt: 'Your hand is two tiles from tenpai and an opponent declares riichi. What is usually best?',
    options: ['Keep building your hand', 'Fold: discard only safe tiles'],
    answer: 1,
    why: 'Far from tenpai, your chance to win is small and dealing in is costly.',
  },
};
