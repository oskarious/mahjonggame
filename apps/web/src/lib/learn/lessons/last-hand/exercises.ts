import type { ExerciseSet } from '../../context';

export const exercises: Record<string, ExerciseSet> = {
  gap: [
    {
      kind: 'choice',
      prompt: 'Last hand: you are 10,000 points behind second place. Which win moves you up?',
      options: ['A 5200 ron from second place', 'A 5200 ron from fourth place', 'A 5200 tsumo'],
      answer: 0,
      why: 'Second place loses 5200 while you gain 5200: the gap closes by 10,400.',
    },
    {
      kind: 'choice',
      prompt:
        'Last hand: neither you nor second place is the dealer, and you are 7,000 behind them. Which win moves you up?',
      options: ['A 3900 tsumo', 'A 3900 ron from the dealer', 'A 3900 ron from second place'],
      answer: 2,
      why: 'The ron from second place closes the gap by 7,800; the tsumo, where they pay 1000, by only 5,000.',
    },
    {
      kind: 'choice',
      prompt:
        'Last hand: you are 5,000 points behind second place. Which is the smallest ron from them that moves you up?',
      options: ['2000', '2600', '3900'],
      answer: 1,
      why: 'A ron from them counts twice: 2600 closes the gap by 5,200, 2000 only by 4,000.',
    },
  ],
  tsumo: [
    {
      kind: 'choice',
      prompt: 'You are not the dealer and win a mangan (8000) by tsumo. How far do you gain on the dealer?',
      options: ['8,000', '10,000', '12,000'],
      answer: 2,
      why: 'You gain 8000 and the dealer pays 4000 of it: the gap moves by 12,000.',
    },
    {
      kind: 'choice',
      prompt:
        'You are not the dealer and win a mangan (8000) by tsumo. How far do you gain on another player who is not the dealer?',
      options: ['8,000', '10,000', '12,000'],
      answer: 1,
      why: 'You gain 8000 and they pay 2000 of it: the gap moves by 10,000.',
    },
    {
      kind: 'choice',
      prompt:
        'Last hand: you are not the dealer, and 10,000 behind the dealer in first. Which mangan win puts you ahead?',
      options: ['A ron from fourth place', 'A tsumo'],
      answer: 1,
      why: 'The tsumo gains 8000 and costs the dealer 4000: 12,000. The ron moves the gap by only 8,000.',
    },
  ],
  lead: [
    {
      kind: 'choice',
      prompt:
        'Last hand: you lead by 3,000, and second place declares riichi. You are two tiles from tenpai: push or fold?',
      options: ['Push', 'Fold'],
      answer: 1,
      why: 'Dealing in to them costs first place; folding keeps it unless they tsumo.',
    },
    {
      kind: 'choice',
      prompt:
        'Last hand: you lead by 3,000 over second place and by 30,000 over fourth. Whose riichi makes you fold sooner?',
      options: ['Fourth place', 'Second place'],
      answer: 1,
      why: 'Almost any deal-in to second place costs first; fourth would need a huge hand to pass you.',
    },
    {
      kind: 'choice',
      prompt: 'Last hand: you lead by 3,000, and second place declares riichi. What is the bigger danger to your lead?',
      options: ['Them winning by tsumo', 'You dealing in to them'],
      answer: 1,
      why: 'A deal-in moves the gap by twice their hand; on a tsumo you pay only a share.',
    },
  ],
};
