import type { Exercise } from '../../types';

export const exercises: Record<string, Exercise> = {
  honitsu: {
    kind: 'yaku',
    expect: ['yakuhaiWhite', 'honitsu'],
    prompt: 'You called pon on white dragons and win by ron on {6m}. Tap every yaku.',
    position: {
      hands: ['234567m99m78m'],
      melds: [[['pon', '555z']]],
      dealer: 3,
      turn: 1,
      draws: '6m',
      discard: true,
    },
    distractors: ['tanyao', 'chinitsu', 'ittsu', 'toitoi', 'chanta'],
    why: 'One suit plus honors is a half flush; the dragon triplet is a second yaku.',
  },
  pairs: {
    kind: 'yaku',
    expect: ['chiitoitsu', 'menzenTsumo'],
    prompt: 'You draw {7z} and win. Tap every yaku.',
    position: { hands: ['1133m5577p2266s7z'], dealer: 3, turn: 0, draws: '7z' },
    distractors: ['toitoi', 'iipeikou', 'honitsu', 'yakuhaiRed'],
    why: 'Seven pairs, and self-draw with a closed hand.',
  },
  straight: {
    kind: 'yaku',
    expect: ['ittsu', 'pinfu'],
    prompt: 'You win by ron on {4s}. Tap every yaku.',
    position: {
      hands: ['123456789p23s55m'],
      dealer: 3,
      turn: 2,
      draws: '4s',
      discard: true,
    },
    distractors: ['tanyao', 'sanshokuDoujun', 'chinitsu', 'iipeikou'],
    why: '1 to 9 in one suit is a pure straight; the rest of the hand also makes pinfu.',
  },
  triplets: {
    kind: 'yaku',
    show: { seat: true, round: true },
    expect: ['toitoi', 'roundWind'],
    prompt: 'Two pons called, and you win by ron on {1z}. Tap every yaku.',
    position: {
      hands: ['777s99m11z'],
      melds: [
        [
          ['pon', '222m'],
          ['pon', '555p'],
        ],
      ],
      dealer: 3,
      turn: 1,
      draws: '1z',
      discard: true,
    },
    distractors: ['sanankou', 'honroutou', 'tanyao', 'seatWind'],
    why: 'Four triplets make all triplets; East is the round wind.',
  },
  closedonly: {
    kind: 'can-win',
    expect: 'no-yaku',
    prompt: 'You called chii on {123m} and hold another {123m}. Can you win on {9s}?',
    position: {
      hands: ['123m456p55s78s'],
      melds: [[['chii', '123m']]],
      dealer: 3,
      turn: 1,
      draws: '9s',
      discard: true,
    },
    why: 'Two identical sequences (iipeikou) only count in a closed hand.',
  },
};
