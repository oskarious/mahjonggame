import type { ExerciseSet } from '../../context';

export const exercises: Record<string, ExerciseSet> = {
  complete: [
    {
      kind: 'pick',
      prompt: 'This hand needs one more tile. Which tiles complete it?',
      position: { hands: ['123m456p789s55m45p'], dealer: 3, turn: 1 },
      goal: 'waits',
      from: '3p6p9p5s7z',
      why: '{3p} or {6p} turns {45p} into a sequence.',
    },
    {
      kind: 'pick',
      prompt: 'This hand needs one more tile. Which tiles complete it?',
      position: { hands: ['345m678p222s99p78s'], dealer: 3, turn: 1 },
      goal: 'waits',
      from: '5s6s9s3p1z',
      why: '{6s} or {9s} turns {78s} into a sequence.',
    },
    {
      kind: 'pick',
      prompt: 'This hand needs one more tile. Which tiles complete it?',
      position: { hands: ['234m555p678s99m13s'], dealer: 3, turn: 1 },
      goal: 'waits',
      from: '1s2s3s4s6z',
      why: 'Only {2s} fills the gap in {13s}.',
    },
  ],
  turn: [
    {
      kind: 'discard',
      prompt: 'You drew {7z}, which does not fit. Discard it.',
      position: {
        hands: ['123m456p789s55m45p'],
        dealer: 3,
        turn: 0,
        draws: '7z',
      },
      goal: 'tenpai',
      only: '7z',
      why: 'Draw one, discard one: that is every turn. (Tenpai, being one tile from winning, is the next step.)',
    },
    {
      kind: 'discard',
      prompt: 'You drew {1z}, which does not fit. Discard it.',
      position: {
        hands: ['234p567s111m88s67m'],
        dealer: 3,
        turn: 0,
        draws: '1z',
      },
      goal: 'tenpai',
      only: '1z',
      why: 'Draw one, discard one: the hand stays one tile from complete.',
    },
    {
      kind: 'discard',
      prompt: 'You drew {1p}, which does not fit. Discard it.',
      position: {
        hands: ['345m678p222s99p78s'],
        dealer: 3,
        turn: 0,
        draws: '1p',
      },
      goal: 'tenpai',
      only: '1p',
      why: '{1p} is far from your other pin tiles, so it builds nothing.',
    },
  ],
  win: [
    {
      kind: 'can-win',
      expect: 'yes',
      prompt: 'You drew {6p}. Can you win?',
      position: {
        hands: ['123m456p789s55m45p'],
        dealer: 3,
        turn: 0,
        draws: '6p',
      },
      why: 'A closed hand completed by your own draw always has a yaku: self-draw.',
    },
    {
      kind: 'can-win',
      expect: 'yes',
      prompt: 'You drew {8m}. Can you win?',
      position: {
        hands: ['234p567s111m88s67m'],
        dealer: 3,
        turn: 0,
        draws: '8m',
      },
      why: '{678m} completes the hand, and your own draw is the yaku: self-draw.',
    },
    {
      kind: 'can-win',
      expect: 'not-complete',
      prompt: 'You drew {5s}. Can you win?',
      position: {
        hands: ['345m678p222s99p78s'],
        dealer: 3,
        turn: 0,
        draws: '5s',
      },
      why: '{5s} does not finish {78s}: only {6s} or {9s} do.',
    },
  ],
};
