import type { Exercise } from '@mahjong/drills/types';

export const exercises: Record<string, Exercise> = {
  complete: {
    kind: 'pick',
    prompt: 'This hand needs one more tile. Which tiles complete it?',
    position: { hands: ['123m456p789s55m45p'], dealer: 3, turn: 1 },
    goal: 'waits',
    from: '3p6p9p5s7z',
    why: '{3p} or {6p} turns {45p} into a sequence.',
  },
  turn: {
    kind: 'discard',
    prompt: 'You drew {7z}, which does not fit. Discard it.',
    position: {
      hands: ['123m456p789s55m45p'],
      dealer: 3,
      turn: 0,
      draws: '7z',
    },
    goal: 'tenpai',
    why: 'Draw one, discard one: that is every turn. (Tenpai, being one tile from winning, is the next step.)',
  },
  win: {
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
};
