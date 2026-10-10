import type { ExerciseSet } from '../../context';

export const exercises: Record<string, ExerciseSet> = {
  dragon: [
    {
      kind: 'call',
      prompt: 'The player across discards {7z}, and you hold a pair of red dragons. Call or pass?',
      position: {
        hands: ['77z234m56p78s99s1m1p'],
        dealer: 3,
        turn: 2,
        draws: '7z',
        discard: true,
      },
      goal: 'pon',
      why: 'The red dragon triplet is a yaku, and the call saves you a draw.',
    },
    {
      kind: 'call',
      prompt: 'The player on your right discards {5z}, and you hold a pair of white dragons. Call or pass?',
      position: {
        hands: ['55z345p67m23s88p9s1z'],
        dealer: 3,
        turn: 1,
        draws: '5z',
        discard: true,
      },
      goal: 'pon',
      why: 'The white dragon triplet is a yaku, and the call saves you a draw.',
    },
    {
      kind: 'call',
      prompt: 'The player on your left discards {1z}, the round wind, and you hold a pair. Call or pass?',
      position: {
        hands: ['11z456s34m78p22p9m5z'],
        dealer: 3,
        turn: 3,
        draws: '1z',
        discard: true,
      },
      show: { round: true },
      goal: 'pon',
      why: 'A triplet of the round wind is a yaku, and the call saves you a draw.',
    },
  ],
  noyaku: [
    {
      kind: 'call',
      prompt: 'The player on your left discards {2m}. Should you chii it?',
      position: {
        hands: ['13m456p789s11s5z9p8p'],
        dealer: 3,
        turn: 3,
        draws: '2m',
        discard: true,
      },
      goal: 'pass',
      why: 'Opened, this hand has no yaku. Closed, it can still declare riichi.',
    },
    {
      kind: 'call',
      prompt: 'The player on your left discards {8p}. Should you chii it?',
      position: {
        hands: ['79p234m567s55m4z1s9m'],
        dealer: 3,
        turn: 3,
        draws: '8p',
        discard: true,
      },
      goal: 'pass',
      why: 'Opened, this hand has no yaku. Closed, it can still declare riichi.',
    },
    {
      kind: 'call',
      prompt: 'The player on your left discards {4s}. Should you chii it?',
      position: {
        hands: ['35s678m123p99p6z9s1m'],
        dealer: 3,
        turn: 3,
        draws: '4s',
        discard: true,
      },
      goal: 'pass',
      why: 'Opened, this hand has no yaku. Closed, it can still declare riichi.',
    },
  ],
  simples: [
    {
      kind: 'call',
      prompt: 'The player on your left discards {5m}, and every tile you hold is 2 to 8. Call or pass?',
      position: {
        hands: ['46m234p567s88p34s2m'],
        dealer: 3,
        turn: 3,
        draws: '5m',
        discard: true,
      },
      goal: 'chii',
      why: 'The chii fills the closed {46m}: discard {2m} and you are in tenpai with all simples, waiting on {2s}, {5s} or {8s}.',
    },
    {
      kind: 'call',
      prompt: 'The player on your left discards {7p}, and every tile you hold is 2 to 8. Call or pass?',
      position: {
        hands: ['68p345m234s77m67s2p'],
        dealer: 3,
        turn: 3,
        draws: '7p',
        discard: true,
      },
      goal: 'chii',
      why: 'The chii fills the closed {68p}: discard {2p} and you are in tenpai with all simples, waiting on {5s} or {8s}.',
    },
    {
      kind: 'call',
      prompt: 'The player on your left discards {3p}, and every tile you hold is 2 to 8. Call or pass?',
      position: {
        hands: ['24p345s678s55m67m8p'],
        dealer: 3,
        turn: 3,
        draws: '3p',
        discard: true,
      },
      goal: 'chii',
      why: 'The chii fills the closed {24p}: discard {8p} and you are in tenpai with all simples, waiting on {5m} or {8m}.',
    },
  ],
  value: [
    {
      kind: 'choice',
      prompt: 'You hold a closed hand two tiles from tenpai with no value tiles. Is it worth calling chii?',
      options: ['Yes, calls are always faster', 'Only with a yaku, and if it gets fast or valuable'],
      answer: 1,
      why: 'Without a yaku an open hand cannot win at all, and a cheap hand that stays slow is not worth opening.',
    },
    {
      kind: 'choice',
      prompt:
        'Your closed hand is one tile from tenpai, with pinfu and two dora in reach. Should you chii to get there faster?',
      options: ['No, it turns a big hand into a small one', 'Yes, faster is always better'],
      answer: 0,
      why: 'Opening throws away riichi and pinfu, 2 han, from a hand that is close anyway.',
    },
    {
      kind: 'choice',
      prompt:
        'A chii would give your hand all simples, but leave it worth 1000 points and still two tiles from tenpai. Is it worth calling?',
      options: ['Yes, it has a yaku now', 'No, it stays cheap and slow'],
      answer: 1,
      why: 'A yaku is not enough: the call costs riichi and leaves a cheap hand still far from tenpai.',
    },
  ],
};
