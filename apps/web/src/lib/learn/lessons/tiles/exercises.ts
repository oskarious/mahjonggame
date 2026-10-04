import type { ExerciseSet } from '../../context';

export const exercises: Record<string, ExerciseSet> = {
  circles: [
    {
      kind: 'pick',
      prompt: 'Tap every pin (circles) tile in this hand.',
      position: { hands: ['147m258p369s1z5z6z7z'], dealer: 3, turn: 1 },
      goal: { group: 'p' },
      why: 'Pin tiles show circles: one circle for 1, nine for 9.',
    },
    {
      kind: 'pick',
      prompt: 'Tap every pin (circles) tile in this hand.',
      position: { hands: ['258m369p147s2z3z4z5z'], dealer: 3, turn: 1 },
      goal: { group: 'p' },
      why: 'Count the circles: {3p}, {6p} and {9p}.',
    },
    {
      kind: 'pick',
      prompt: 'Tap every pin (circles) tile in this hand.',
      position: { hands: ['1122m34p5566s789p'], dealer: 3, turn: 1 },
      goal: { group: 'p' },
      why: 'Man tiles carry a number, sou tiles bamboo sticks; only pin tiles show circles.',
    },
  ],
  honors: [
    {
      kind: 'pick',
      prompt: 'Tap every honor tile.',
      position: { hands: ['19m28p37s1234567z'], dealer: 3, turn: 1 },
      goal: { group: 'honors' },
      why: 'Honors are the four winds and the three dragons: no numbers.',
    },
    {
      kind: 'pick',
      prompt: 'Tap every honor tile.',
      position: { hands: ['123m456p789s2z5z7z1s'], dealer: 3, turn: 1 },
      goal: { group: 'honors' },
      why: 'South, white and red: a wind and two dragons.',
    },
    {
      kind: 'pick',
      prompt: 'Tap every honor tile.',
      position: { hands: ['11z55p66z99s3z4m7z44s'], dealer: 3, turn: 1 },
      goal: { group: 'honors' },
      why: 'East, West, green and red; {9s} and {5p} are number tiles.',
    },
  ],
  green: [
    {
      kind: 'choice',
      prompt: 'Which one is the green dragon?',
      options: ['{5z}', '{6z}', '{7z}', '{2s}'],
      answer: 1,
      why: 'White is the plain tile, green is {6z}, red is {7z}.',
    },
    {
      kind: 'choice',
      prompt: 'Which one is the red dragon?',
      options: ['{6z}', '{5z}', '{7z}', '{7p}'],
      answer: 2,
      why: 'Red is {7z}, marked 中; {7p} is a pin tile.',
    },
    {
      kind: 'choice',
      prompt: 'Which one is the white dragon?',
      options: ['{7z}', '{6z}', '{1z}', '{5z}'],
      answer: 3,
      why: 'White is the plain tile {5z}; {1z} is the East wind.',
    },
  ],
  terminals: [
    {
      kind: 'pick',
      prompt: 'Tap every terminal: the 1s and 9s.',
      position: { hands: ['129m189p19s2378s5z'], dealer: 3, turn: 1 },
      goal: { group: 'terminals' },
      why: 'Terminals are the ends of each suit. Honors are not terminals.',
    },
    {
      kind: 'pick',
      prompt: 'Tap every terminal: the 1s and 9s.',
      position: { hands: ['19p11s99m28m37p4z6z5s'], dealer: 3, turn: 1 },
      goal: { group: 'terminals' },
      why: '{1p}, {9p}, {1s} and {9m}; the 2s to 8s are simples.',
    },
    {
      kind: 'pick',
      prompt: 'Tap every terminal: the 1s and 9s.',
      position: { hands: ['123789s19m555p77z'], dealer: 3, turn: 1 },
      goal: { group: 'terminals' },
      why: 'A 1 or 9 inside a sequence is still a terminal. Honors are not terminals.',
    },
  ],
  count: [
    {
      kind: 'choice',
      prompt: 'How many tiles are there in a set?',
      options: ['108', '136', '144'],
      answer: 1,
      why: '34 different tiles, four copies of each.',
    },
    {
      kind: 'choice',
      prompt: 'How many red fives are there on Riichi Arena?',
      options: ['One', 'Three', 'Four'],
      answer: 1,
      why: 'One 5 of each suit: {0m}, {0p} and {0s}.',
    },
    {
      kind: 'choice',
      prompt: 'How many copies of each tile are there?',
      options: ['Four', 'Two', 'Three'],
      answer: 0,
      why: 'Four of each, 136 tiles in all; a red five is one of the four 5s.',
    },
  ],
};
