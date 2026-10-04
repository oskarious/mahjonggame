import type { ExerciseSet } from '../../context';

export const exercises: Record<string, ExerciseSet> = {
  deals: [
    {
      kind: 'choice',
      prompt: 'How many deals does an East-only game have at least?',
      options: ['4', '8', '16'],
      answer: 0,
      why: 'Each player deals once; repeats make it longer.',
    },
    {
      kind: 'choice',
      prompt: 'How many deals does an East + South game have at least?',
      options: ['4', '8', '16'],
      answer: 1,
      why: 'Each player deals once per round, and there are two rounds.',
    },
    {
      kind: 'choice',
      prompt: 'The dealer wins East 2. Which deal comes next?',
      options: ['East 3', 'East 2 again', 'South 1'],
      answer: 1,
      why: 'A winning dealer deals again, so the round gets longer.',
    },
  ],
  uma: [
    {
      kind: 'choice',
      prompt: 'With 15-5 uma, what does second place get added?',
      options: ['+15,000', '+5,000', 'Nothing'],
      answer: 1,
      why: 'First +15,000, second +5,000, third -5,000, fourth -15,000.',
    },
    {
      kind: 'choice',
      prompt: 'With 15-5 uma, what does fourth place get added?',
      options: ['-15,000', '-5,000', 'Nothing'],
      answer: 0,
      why: 'Last place loses another 15,000.',
    },
    {
      kind: 'choice',
      prompt: 'First and second end the game 1,000 points apart. How far apart are they after 15-5 uma?',
      options: ['1,000', '10,000', '11,000'],
      answer: 2,
      why: 'First gets 15,000 and second 5,000: 10,000 more between them.',
    },
  ],
  bust: [
    {
      kind: 'choice',
      prompt: 'On Riichi Arena a player drops below zero points. What happens?',
      options: ['The game ends', 'They keep playing in debt', 'They get points back'],
      answer: 0,
      why: 'Going bust ends the game at once.',
    },
    {
      kind: 'choice',
      prompt: 'In an East-only game, a non-dealer wins East 4. What happens next?',
      options: ['South 1 starts', 'East 4 is dealt again', 'The game ends'],
      answer: 2,
      why: 'That was the last deal of the last round.',
    },
    {
      kind: 'choice',
      prompt: 'On Riichi Arena a player is left with exactly 0 points. Does the game end?',
      options: ['Yes', 'No, only below zero ends it'],
      answer: 1,
      why: 'At 0 the player is not bust yet.',
    },
  ],
};
