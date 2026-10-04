import type { Exercise } from '@mahjong/drills/types';

export const exercises: Record<string, Exercise> = {
  gap: {
    kind: 'choice',
    prompt: 'Last hand: you are 10,000 points behind second place. Which win moves you up?',
    options: ['A 5200 ron from second place', 'A 5200 ron from fourth place', 'A 5200 tsumo'],
    answer: 0,
    why: 'Second place loses 5200 while you gain 5200: the gap closes by 10,400.',
  },
  tsumo: {
    kind: 'choice',
    prompt: 'You are not the dealer and win a mangan (8000) by tsumo. How far do you gain on the dealer?',
    options: ['8,000', '10,000', '12,000'],
    answer: 2,
    why: 'You gain 8000 and the dealer pays 4000 of it: the gap moves by 12,000.',
  },
  lead: {
    kind: 'choice',
    prompt: 'Last hand: you lead by 3,000, and second place declares riichi. You are two tiles from tenpai: push or fold?',
    options: ['Push', 'Fold'],
    answer: 1,
    why: 'Dealing in to them costs first place; folding keeps it unless they tsumo.',
  },
};
