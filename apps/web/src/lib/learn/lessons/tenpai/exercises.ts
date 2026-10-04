import type { ExerciseSet } from '../../context';

export const exercises: Record<string, ExerciseSet> = {
  first: [
    {
      kind: 'discard',
      prompt: 'You drew {7z}. Discard one tile to reach tenpai.',
      position: { hands: ['234m567p23s789s99s'], draws: '7z' },
      goal: 'tenpai',
      why: 'Now {23s} waits on {1s} or {4s}.',
    },
    {
      kind: 'discard',
      prompt: 'You drew {8m}. Discard one tile to reach tenpai.',
      position: { hands: ['345m7m234p11p567s1z'], draws: '8m' },
      goal: 'tenpai',
      why: 'Now {78m} waits on {6m} or {9m}.',
    },
    {
      kind: 'discard',
      prompt: 'You drew {6s}. Discard one tile to reach tenpai.',
      position: { hands: ['456m23p789p11s57s9m'], draws: '6s' },
      goal: 'tenpai',
      why: 'Now {23p} waits on {1p} or {4p}.',
    },
  ],
  choose: [
    {
      kind: 'discard',
      prompt: 'You drew {4s}. Which discard leaves you in tenpai?',
      position: { hands: ['123m456m78p35s99p9s'], draws: '4s' },
      goal: 'tenpai',
      why: 'The {4s} fills {35s}; then the lone {9s} goes.',
    },
    {
      kind: 'discard',
      prompt: 'You drew {5s}. Which discard leaves you in tenpai?',
      position: { hands: ['234p567p89m22s46s1z'], draws: '5s' },
      goal: 'tenpai',
      why: 'The {5s} fills {46s}; then the lone {1z} goes.',
    },
    {
      kind: 'discard',
      prompt: 'You drew {3p}. Which discard leaves you in tenpai?',
      position: { hands: ['678s345s24p55m9p68m'], draws: '3p' },
      goal: 'tenpai',
      why: 'The {3p} fills {24p}; then the lone {9p} goes.',
    },
  ],
  away: [
    {
      kind: 'choice',
      prompt: 'How far is this hand from tenpai?',
      position: { hands: ['123m456p78s35s11z9m'], turn: 1 },
      options: ['Tenpai', '1-shanten (one tile away)', '2-shanten (two tiles away)'],
      answer: 1,
      claim: { shanten: 1 },
      why: 'One more useful tile ({6s}, {9s} or {4s}) puts it in tenpai.',
    },
    {
      kind: 'choice',
      prompt: 'How far is this hand from tenpai?',
      position: { hands: ['345m678p22s45s789m'], turn: 1 },
      options: ['Tenpai', '1-shanten (one tile away)', '2-shanten (two tiles away)'],
      answer: 0,
      claim: { shanten: 0, waits: '36s' },
      why: 'It already waits: {3s} or {6s} wins.',
    },
    {
      kind: 'choice',
      prompt: 'How far is this hand from tenpai?',
      position: { hands: ['234p57p13s66m78m9s1z'], turn: 1 },
      options: ['Tenpai', '1-shanten (one tile away)', '2-shanten (two tiles away)'],
      answer: 2,
      claim: { shanten: 2 },
      why: 'One set and four partial sets: two more useful tiles before tenpai.',
    },
  ],
  stay: [
    {
      kind: 'discard',
      prompt: 'You drew {1p}. Discard without moving away from tenpai.',
      position: { hands: ['123m456p78s35s11z9m'], turn: 0, draws: '1p' },
      goal: 'min-shanten',
      why: 'Isolated tiles like {1p} and {9m} help least.',
    },
    {
      kind: 'discard',
      prompt: 'You drew {2m}. Discard without moving away from tenpai.',
      position: { hands: ['234p567m46s88s79m1z'], turn: 0, draws: '2m' },
      goal: 'min-shanten',
      why: 'Isolated tiles like {2m} and {1z} help least.',
    },
    {
      kind: 'discard',
      prompt: 'You drew {7z}. Discard without moving away from tenpai.',
      position: { hands: ['456p8p234s99m68m13s'], turn: 0, draws: '7z' },
      goal: 'min-shanten',
      why: 'Isolated tiles like {8p} and {7z} help least.',
    },
  ],
};
