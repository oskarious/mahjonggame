import type { Exercise } from '../../types';

export const exercises: Record<string, Exercise> = {
  circles: {
    kind: 'pick',
    prompt: 'Tap every pin (circles) tile in this hand.',
    position: { hands: ['147m258p369s1z5z6z7z'], dealer: 3, turn: 1 },
    goal: { group: 'p' },
    why: 'Pin tiles show circles: one circle for 1, nine for 9.',
  },
  honors: {
    kind: 'pick',
    prompt: 'Tap every honor tile.',
    position: { hands: ['19m28p37s1234567z'], dealer: 3, turn: 1 },
    goal: { group: 'honors' },
    why: 'Honors are the four winds and the three dragons: no numbers.',
  },
  green: {
    kind: 'choice',
    prompt: 'Which one is the green dragon?',
    options: ['{5z}', '{6z}', '{7z}', '{2s}'],
    answer: 1,
    why: 'White is the plain tile, green is {6z}, red is {7z}.',
  },
  terminals: {
    kind: 'pick',
    prompt: 'Tap every terminal: the 1s and 9s.',
    position: { hands: ['129m189p19s2378s5z'], dealer: 3, turn: 1 },
    goal: { group: 'terminals' },
    why: 'Terminals are the ends of each suit. Honors are not terminals.',
  },
  count: {
    kind: 'choice',
    prompt: 'How many tiles are there in a set?',
    options: ['108', '136', '144'],
    answer: 1,
    why: '34 different tiles, four copies of each.',
  },
};
