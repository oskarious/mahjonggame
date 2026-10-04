import type { Exercise } from '../../types';

export const exercises: Record<string, Exercise> = {
  dragon: {
    kind: 'call',
    prompt: 'The player across discards {7z}, and you hold a pair of red dragons. Call or pass?',
    position: {
      hands: ['77z234m56p78s99s1m1p'],
      dealer: 3,
      turn: 2,
      draws: '7z',
      discard: true,
    },
    goal: 'pon',
    why: 'The red dragon triplet is a yaku, and the call saves you a draw.',
  },
  noyaku: {
    kind: 'call',
    prompt: 'The player on your left discards {2m}. Should you chii it?',
    position: {
      hands: ['13m456p789s11s5z9p8p'],
      dealer: 3,
      turn: 3,
      draws: '2m',
      discard: true,
    },
    goal: 'pass',
    why: 'Opened, this hand has no yaku. Closed, it can still declare riichi.',
  },
  simples: {
    kind: 'call',
    prompt: 'The player on your left discards {5m}, and every tile you hold is 2 to 8. Call or pass?',
    position: {
      hands: ['46m234p567s88p34s2m'],
      dealer: 3,
      turn: 3,
      draws: '5m',
      discard: true,
    },
    goal: 'chii',
    why: 'The chii fills the closed {46m}: discard {2m} and you are in tenpai with all simples, waiting on {2s} or {5s}.',
  },
  value: {
    kind: 'choice',
    prompt: 'You hold a closed hand two tiles from tenpai with no value tiles. Is it worth calling chii?',
    options: ['Yes, calls are always faster', 'Only with a yaku, and if it gets fast or valuable'],
    answer: 1,
    why: 'Without a yaku an open hand cannot win at all, and a cheap hand that stays slow is not worth opening.',
  },
};
