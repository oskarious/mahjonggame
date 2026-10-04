import type { Exercise } from '../../types';

export const exercises: Record<string, Exercise> = {
  tsumo: {
    kind: 'score',
    show: { seat: true },
    expect: '700 / 1300',
    prompt: 'You draw {4s} and win. What do the others pay?',
    position: {
      hands: ['234m456p678s55m23s'],
      dealer: 3,
      turn: 0,
      draws: '4s',
    },
    ask: 'points',
    why: 'Self-draw, all simples and pinfu: 3 han 20 fu. The dealer pays the larger share.',
  },
  gain: {
    kind: 'score',
    show: { seat: true, counters: true },
    expect: '3600',
    prompt: 'Two counters and one riichi stick are on the table. You win by ron on {4s}: what do you collect?',
    position: {
      hands: ['234m456p678s55m23s'],
      dealer: 3,
      honba: 2,
      riichiSticks: 1,
      turn: 2,
      draws: '4s',
      discard: true,
    },
    ask: 'gain',
    why: '2000 for the hand, 600 for the counters, 1000 for the stick.',
  },
  alone: {
    kind: 'choice',
    prompt: 'The wall runs out and only you are in tenpai. What do you receive?',
    options: ['1000', '1500', '3000'],
    answer: 2,
    why: 'The three noten players pay 1000 each.',
  },
  two: {
    kind: 'choice',
    prompt: 'At the draw two players are in tenpai. What does each noten player pay?',
    options: ['1000', '1500', '3000'],
    answer: 1,
    why: '3000 moves in total: each noten player pays 1500, each tenpai player gets 1500.',
  },
  dealer: {
    kind: 'choice',
    prompt: 'The dealer is in tenpai when the wall runs out. Who deals next?',
    options: ['The same dealer, with a counter added', 'The next player'],
    answer: 0,
    why: 'A tenpai dealer keeps the seat.',
  },
};
