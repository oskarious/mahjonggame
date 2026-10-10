// The course: units and lessons in teaching order. The Learn index, prev/next links, the sitemap and the lesson
// test all read this list, so a lesson is added here and in lessons/<slug>/ (Lesson.svelte + exercises.ts).

export interface Unit {
  id: string;
  title: string;
}

export interface LessonMeta {
  slug: string;
  unit: string;
  /** The page's h1 and the name in lists. */
  title: string;
  /** <title> (the site name is appended): written for the search query the lesson targets. */
  seoTitle: string;
  /** Meta description: one or two sentences, under ~160 characters. */
  description: string;
  /** One line for the course index. */
  summary: string;
  /** Two or more slugs shown as "related" at the end. */
  related: string[];
  /** Purely descriptive: allowed to have no exercise. */
  descriptive?: boolean;
  /** Not listed or served in production yet. */
  draft?: boolean;
  /** First published (JSON-LD datePublished), YYYY-MM-DD. */
  published: string;
  /** Last content change (sitemap lastmod, JSON-LD dateModified), YYYY-MM-DD; not before `published`. */
  updated: string;
}

export const UNITS: Unit[] = [
  { id: 'basics', title: 'Basics' },
  { id: 'reading', title: 'Reading your hand' },
  { id: 'yaku', title: 'Yaku' },
  { id: 'scoring', title: 'Scoring' },
  { id: 'hand', title: 'Building a hand' },
  { id: 'attack-defense', title: 'Attack and defense' },
];

/** The course's launch: every lesson so far was written for it. */
const P = '2026-10-03';
const U = '2026-10-03';

export const LESSONS: LessonMeta[] = [
  {
    slug: 'how-to-play',
    unit: 'basics',
    title: 'How to play riichi mahjong',
    seoTitle: 'How to play riichi mahjong: a beginner’s guide',
    description:
      'Learn riichi mahjong from scratch: the goal, the tiles, a turn and how to win, with interactive hands you play right in the page.',
    summary: 'The goal of the game and what a winning hand looks like.',
    related: ['tiles', 'sets-and-winning-hands', 'winning'],
    published: P,
    updated: U,
  },
  {
    slug: 'tiles',
    unit: 'basics',
    title: 'The tiles',
    seoTitle: 'Riichi mahjong tiles: suits, honors and their names',
    description:
      'All 34 riichi mahjong tiles explained: the man, pin and sou suits, winds, dragons, terminals, red fives and how to read them.',
    summary: 'Three suits, winds and dragons: names and how to read them.',
    related: ['sets-and-winning-hands', 'dora', 'how-to-play'],
    published: P,
    updated: U,
  },
  {
    slug: 'sets-and-winning-hands',
    unit: 'basics',
    title: 'Sets and a winning hand',
    seoTitle: 'Mahjong sets: sequences, triplets, pairs and winning hands',
    description:
      'What makes a winning hand in riichi mahjong: four sets and a pair, sequences, triplets, quads, plus seven pairs and thirteen orphans.',
    summary: 'Four sets and a pair: sequences, triplets, quads.',
    related: ['tiles', 'tenpai', 'winning'],
    published: P,
    updated: U,
  },
  {
    slug: 'table-and-turns',
    unit: 'basics',
    title: 'The table and a turn',
    seoTitle: 'The riichi mahjong table: seats, the wall and a turn',
    description:
      'How a riichi mahjong table works: seats and winds, the dealer, the wall and dead wall, the dora indicator, drawing and discarding.',
    summary: 'Seats, the wall, the dora indicator, draw and discard.',
    related: ['calling', 'dora', 'ending-a-game'],
    published: P,
    updated: U,
  },
  {
    slug: 'calling',
    unit: 'basics',
    title: 'Calling: chii, pon and kan',
    seoTitle: 'Chii, pon and kan: calling tiles in riichi mahjong',
    description:
      'When and how to call in riichi mahjong: chii from the left, pon and kan from anyone, call priority, and what an open hand costs you.',
    summary: 'Taking discards to finish sets, and what it costs.',
    related: ['winning', 'when-to-call', 'first-yaku'],
    published: P,
    updated: U,
  },
  {
    slug: 'winning',
    unit: 'basics',
    title: 'Winning: tsumo, ron and yaku',
    seoTitle: 'How to win in riichi mahjong: tsumo, ron and why you need a yaku',
    description:
      'Win by tsumo or ron, and learn the rule that trips up every beginner: a complete hand needs at least one yaku to win.',
    summary: 'Tsumo, ron, and the one-yaku rule.',
    related: ['first-yaku', 'furiten', 'calling'],
    published: P,
    updated: U,
  },
  {
    slug: 'tenpai',
    unit: 'reading',
    title: 'Tenpai and shanten',
    seoTitle: 'What is tenpai? Tenpai and shanten in riichi mahjong',
    description:
      'Tenpai means one tile from winning; shanten counts how far you are. Practise finding the discard that gets you to tenpai.',
    summary: 'One tile from winning, and how to count the distance.',
    related: ['waits', 'tile-efficiency', 'riichi'],
    published: P,
    updated: U,
  },
  {
    slug: 'waits',
    unit: 'reading',
    title: 'Wait shapes',
    seoTitle: 'Riichi mahjong waits: ryanmen, kanchan, penchan, shanpon, tanki',
    description:
      'Learn every wait shape in riichi mahjong, from the two-sided ryanmen to the single tanki, and find all the tiles a hand is waiting on.',
    summary: 'Ryanmen, kanchan, penchan, shanpon, tanki and multi-sided waits.',
    related: ['tenpai', 'furiten', 'counting-fu'],
    published: P,
    updated: U,
  },
  {
    slug: 'furiten',
    unit: 'reading',
    title: 'Furiten',
    seoTitle: 'Furiten in riichi mahjong: when you can’t win by ron',
    description:
      'Furiten explained: why you cannot ron on a tile you discarded, temporary and riichi furiten, and why tsumo still works.',
    summary: 'Why you sometimes cannot win on a discard.',
    related: ['waits', 'winning', 'riichi'],
    published: P,
    updated: U,
  },
  {
    slug: 'first-yaku',
    unit: 'yaku',
    title: 'Your first yaku',
    seoTitle: 'The first five yaku: riichi, tsumo, tanyao, yakuhai and pinfu',
    description:
      'The five yaku that win most hands: riichi, menzen tsumo, tanyao (all simples), yakuhai (value tiles) and pinfu, with practice hands.',
    summary: 'Riichi, tsumo, all simples, value tiles and pinfu.',
    related: ['riichi', 'more-yaku', 'winning'],
    published: P,
    updated: U,
  },
  {
    slug: 'riichi',
    unit: 'yaku',
    title: 'Riichi',
    seoTitle: 'How to declare riichi: rules, ippatsu and ura dora',
    description:
      'Declaring riichi step by step: when you can, the 1000-point stick, the locked hand, ippatsu, ura dora and when riichi is worth it.',
    summary: 'Declaring ready: conditions, the deposit, ippatsu, ura dora.',
    related: ['first-yaku', 'furiten', 'dora'],
    published: P,
    updated: U,
  },
  {
    slug: 'dora',
    unit: 'yaku',
    title: 'Dora',
    seoTitle: 'Dora in riichi mahjong: indicators, ura, kan and red fives',
    description:
      'How dora work: read the indicator, find the dora (with wrap-around), kan dora, ura dora and red fives, and why dora are not yaku.',
    summary: 'Bonus tiles: the indicator, wrap-around, ura and red fives.',
    related: ['tiles', 'riichi', 'han-and-fu'],
    published: P,
    updated: U,
  },
  {
    slug: 'more-yaku',
    unit: 'yaku',
    title: 'More yaku',
    seoTitle: 'Common riichi mahjong yaku: honitsu, toitoi, chiitoitsu and more',
    description:
      'The next yaku to learn: half flush, all triplets, seven pairs, pure straight, mixed triple sequence and more, open and closed values.',
    summary: 'Flushes, triplets, straights and closed-only yaku.',
    related: ['first-yaku', 'han-and-fu', 'when-to-call'],
    published: P,
    updated: U,
  },
  {
    slug: 'han-and-fu',
    unit: 'scoring',
    title: 'Scoring: han and fu',
    seoTitle: 'How to score riichi mahjong: han, fu and the score table',
    description:
      'How a riichi mahjong hand is scored: han from yaku and dora, fu, base points, mangan and other limits, dealer bonus, ron and tsumo payments.',
    summary: 'From han and fu to points: the score table and limits.',
    related: ['counting-fu', 'payments-and-draws', 'more-yaku'],
    published: P,
    updated: U,
  },
  {
    slug: 'counting-fu',
    unit: 'scoring',
    title: 'Counting fu',
    seoTitle: 'Fu calculation in riichi mahjong, step by step',
    description:
      'Count fu step by step: base fu, closed ron and tsumo, triplets and quads, pairs and waits, rounding, and the fixed cases.',
    summary: 'Build a hand’s fu one part at a time.',
    related: ['han-and-fu', 'waits', 'first-yaku'],
    published: P,
    updated: U,
  },
  {
    slug: 'payments-and-draws',
    unit: 'scoring',
    title: 'Payments, counters and draws',
    seoTitle: 'Riichi mahjong payments: honba, riichi sticks and draws',
    description:
      'Who pays what: ron and tsumo payments, honba counters, riichi sticks, exhaustive draws and noten payments, and dealer repeats.',
    summary: 'Honba, riichi sticks, draws and noten payments.',
    related: ['han-and-fu', 'ending-a-game', 'riichi'],
    published: P,
    updated: U,
  },
  {
    slug: 'ending-a-game',
    unit: 'scoring',
    title: 'How a game ends',
    seoTitle: 'How a riichi mahjong game ends: rounds, placement and uma',
    description: 'Rounds and game length, the dealer passing, when the game ends, final placement, uma and going bust.',
    summary: 'Rounds, placement, uma and going bust.',
    related: ['payments-and-draws', 'table-and-turns', 'defense'],
    published: P,
    updated: U,
  },
  {
    slug: 'tile-efficiency',
    unit: 'hand',
    title: 'Tile efficiency',
    seoTitle: 'Riichi mahjong tile efficiency: what to discard',
    description:
      'Learn what to discard: count the tiles that improve your hand, when lone honors go first, when to keep them, and why closed beats edge.',
    summary: 'Discard so the most tiles help you.',
    related: ['shapes', 'five-blocks', 'tenpai'],
    published: P,
    updated: U,
  },
  {
    slug: 'shapes',
    unit: 'hand',
    title: 'Good and bad shapes',
    seoTitle: 'Riichi mahjong shapes: two-sided, closed, edge and complex shapes',
    description:
      'Which partial sets are worth keeping: two-sided beats closed beats edge, middle tiles, complex shapes, how many pairs to keep.',
    summary: 'Rank partial sets, keep the shapes that make good waits.',
    related: ['tile-efficiency', 'five-blocks', 'waits'],
    published: P,
    updated: U,
  },
  {
    slug: 'five-blocks',
    unit: 'hand',
    title: 'The five-block method',
    seoTitle: 'The five-block method in riichi mahjong: what to discard',
    description:
      'Count your hand in five blocks (four sets and a pair) to know what to discard: with six blocks drop the weakest, with four build one.',
    summary: 'Four sets and a pair: count blocks to find the discard.',
    related: ['shapes', 'tile-efficiency', 'aiming-for-yaku'],
    published: P,
    updated: U,
  },
  {
    slug: 'aiming-for-yaku',
    unit: 'hand',
    title: 'Aiming for yaku',
    seoTitle: 'Building toward yaku in riichi mahjong: straights, flushes, pairs',
    description:
      'When to bend your hand toward a yaku: pure straight, mixed triple sequence, pinfu, half flush, and seven pairs or all triplets.',
    summary: 'Which yaku are worth a few tiles of speed.',
    related: ['five-blocks', 'more-yaku', 'when-to-call'],
    published: P,
    updated: U,
  },
  {
    slug: 'when-to-call',
    unit: 'hand',
    title: 'When to call',
    seoTitle: 'When to call pon and chii in riichi mahjong',
    description:
      'Call with a plan: keep a yaku, call when it makes the hand fast or valuable, never cheap and slow, and when to stay closed for riichi.',
    summary: 'Call with a yaku, and only when it makes the hand fast or big.',
    related: ['calling', 'first-yaku', 'more-yaku'],
    published: P,
    updated: U,
  },
  {
    slug: 'riichi-or-dama',
    unit: 'attack-defense',
    title: 'Riichi or dama',
    seoTitle: 'When to riichi in mahjong, and when to stay dama',
    description:
      'Should you declare riichi? The three reasons to riichi, value against wait, riichi as soon as you are tenpai, and the few hands to keep dama.',
    summary: 'When to declare riichi, and the few hands to keep quiet.',
    related: ['riichi', 'push-or-fold', 'waits'],
    published: P,
    updated: U,
  },
  {
    slug: 'defense',
    unit: 'attack-defense',
    title: 'Basic defense',
    seoTitle: 'Riichi mahjong defense: genbutsu, suji and kabe',
    description: 'How not to deal in: genbutsu (safe tiles), suji, kabe (walls), and when to fold against a riichi.',
    summary: 'Safe and safer tiles against a riichi.',
    related: ['push-or-fold', 'furiten', 'riichi'],
    published: P,
    updated: U,
  },
  {
    slug: 'push-or-fold',
    unit: 'attack-defense',
    title: 'Push or fold',
    seoTitle: 'Push or fold in riichi mahjong: when to keep attacking',
    description:
      'Push or fold against a riichi: the two-of-three rule (tenpai, value, good wait), how safe each tile is, and what to throw when nothing is safe.',
    summary: 'Keep attacking or give up the hand: the two-of-three rule.',
    related: ['defense', 'riichi-or-dama', 'last-hand'],
    published: P,
    updated: U,
  },
  {
    slug: 'last-hand',
    unit: 'attack-defense',
    title: 'The last hand',
    seoTitle: 'Riichi mahjong endgame: placement, uma and the last hand',
    description:
      'Play the last hand for placement: what uma is worth, the hand you need to move up, and how much a tsumo swings against the dealer.',
    summary: 'Play for placement: the value you need to move up.',
    related: ['ending-a-game', 'push-or-fold', 'han-and-fu'],
    published: P,
    updated: U,
  },
];

/** Reference pages that are not lessons but belong to the course (index, sitemap, CTA). */
export const REFERENCE = {
  yaku: {
    path: '/learn/yaku',
    title: 'Yaku list',
    seoTitle: 'Riichi mahjong yaku list: every yaku with example hands',
    description:
      'Every riichi mahjong yaku and yakuman with its han (closed and open), the rule in one line and an example hand.',
  },
  glossary: {
    path: '/learn/glossary',
    title: 'Glossary',
    seoTitle: 'Riichi mahjong glossary: Japanese terms explained',
    description:
      'Riichi mahjong terms in plain English: tenpai, shanten, furiten, yaku, han, fu, dora, tsumo, ron, pon, chii, kan and more.',
  },
} as const;

/** Lessons visible in this build: drafts only in dev. */
export function published(dev: boolean): LessonMeta[] {
  return LESSONS.filter((l) => dev || !l.draft);
}

export function lessonBySlug(slug: string, dev: boolean): LessonMeta | undefined {
  return published(dev).find((l) => l.slug === slug);
}

/** Previous and next lesson in course order (published only). */
export function neighbours(slug: string, dev: boolean): { prev?: LessonMeta; next?: LessonMeta } {
  const list = published(dev);
  const i = list.findIndex((l) => l.slug === slug);
  return { prev: list[i - 1], next: list[i + 1] };
}
