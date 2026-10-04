import type { ExerciseSet } from '../../context';

export const exercises: Record<string, ExerciseSet> = {
  declare: [
    {
      kind: 'discard',
      prompt: 'You drew {3z}. Discard for riichi with the most winning tiles.',
      position: { hands: ['123m456p789p5678s'], dealer: 3, turn: 0, draws: '3z' },
      goal: 'max-ukeire',
      why: 'Dropping {3z} keeps {5678s} waiting on {5s} or {8s}; any other tenpai discard leaves a single wait on {3z}.',
    },
    {
      kind: 'discard',
      prompt: 'You drew {7s}. Discard for riichi with the most winning tiles.',
      position: { hands: ['234m567p333s99p46s'], dealer: 3, turn: 0, draws: '7s' },
      goal: 'max-ukeire',
      only: '4s',
      why: 'Dropping {4s} leaves {67s} waiting on {5s} or {8s}; dropping {7s} leaves only {5s}.',
    },
    {
      kind: 'discard',
      prompt: 'You drew {4m}. Discard for riichi with the most winning tiles.',
      position: { hands: ['123p345s789s66m13m'], dealer: 3, turn: 0, draws: '4m' },
      goal: 'max-ukeire',
      only: '1m',
      why: 'Dropping {1m} leaves {34m} waiting on {2m} or {5m}; dropping {4m} leaves only {2m}.',
    },
  ],
  open: [
    {
      kind: 'choice',
      prompt: 'You called pon earlier this hand. Can you declare riichi?',
      options: ['Yes', 'No'],
      answer: 1,
      why: 'Riichi needs a closed hand.',
    },
    {
      kind: 'choice',
      prompt: 'Your hand is in tenpai and your only meld is a concealed kan. Can you declare riichi?',
      options: ['Yes', 'No'],
      answer: 0,
      why: 'A concealed kan keeps the hand closed.',
    },
    {
      kind: 'choice',
      prompt: 'Your closed hand is in tenpai, but you have 800 points. Can you declare riichi?',
      options: ['Yes', 'No'],
      answer: 1,
      why: 'Riichi costs a 1000-point stick, so you need at least 1000 points.',
    },
  ],
  locked: [
    {
      kind: 'choice',
      prompt: 'After riichi you draw a tile that would give you a better wait. What can you do?',
      options: ['Keep it and change the wait', 'Discard it', 'Cancel the riichi'],
      answer: 1,
      why: 'After riichi you discard every tile you draw unless it wins.',
    },
    {
      kind: 'choice',
      prompt: 'You are in riichi and someone discards a tile you could pon. Can you call it?',
      options: ['Yes', 'No'],
      answer: 1,
      why: 'A call would change your hand; from discards you can only win by ron.',
    },
    {
      kind: 'choice',
      prompt: 'In riichi you let your winning tile pass without calling ron. What happens?',
      options: ['Nothing changes', 'Your riichi is cancelled', 'You can no longer win by ron this hand'],
      answer: 2,
      why: 'You are furiten for the rest of the hand; you can still win by self-draw.',
    },
  ],
  win: [
    {
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
    {
      kind: 'yaku',
      expect: ['riichi', 'tanyao'],
      prompt: 'You are in riichi and win by ron on {5p}. Tap every yaku.',
      position: {
        hands: ['234m345s678s88m46p'],
        riichi: [0],
        dealer: 3,
        turn: 2,
        draws: '5p',
        discard: true,
      },
      why: 'Riichi and all simples stack; the closed wait rules out pinfu.',
    },
    {
      kind: 'yaku',
      expect: ['riichi', 'menzenTsumo', 'yakuhaiWhite'],
      prompt: 'You are in riichi and draw {2s}. Tap every yaku.',
      position: {
        hands: ['555z123m789p34s99s'],
        riichi: [0],
        dealer: 3,
        turn: 0,
        draws: '2s',
      },
      why: 'Riichi, self-draw and the white dragon triplet all stack.',
    },
  ],
};
