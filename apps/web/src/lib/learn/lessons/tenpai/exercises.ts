import type { Exercise } from '../../types';

export const exercises: Record<string, Exercise> = {
  first: {
    kind: 'discard',
    prompt: 'You drew {7z}. Discard one tile to reach tenpai.',
    position: { hands: ['234m567p23s789s99s'], draws: '7z' },
    goal: 'tenpai',
    why: 'Now {23s} waits on {1s} or {4s}.',
  },
  choose: {
    kind: 'discard',
    prompt: 'You drew {4s}. Which discard leaves you in tenpai?',
    position: { hands: ['123m456m78p35s99p9s'], draws: '4s' },
    goal: 'tenpai',
    why: 'The {9s} was the only tile not working with the others.',
  },
  away: {
    kind: 'choice',
    prompt: 'How far is this hand from tenpai?',
    position: { hands: ['123m456p78s35s11z9m'], turn: 1 },
    options: ['Tenpai', '1-shanten (one tile away)', '2-shanten (two tiles away)'],
    answer: 1,
    claim: { shanten: 1 },
    why: 'One more useful tile ({6s}, {9s} or {4s}) puts it in tenpai.',
  },
  stay: {
    kind: 'discard',
    prompt: 'You drew {1p}. Discard without moving away from tenpai.',
    position: { hands: ['123m456p78s35s11z9m'], turn: 0, draws: '1p' },
    goal: 'min-shanten',
    why: 'Isolated tiles like {1p} and {9m} help least.',
  },
};
