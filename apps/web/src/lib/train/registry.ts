// The trainers: the hub, the trainer pages, the sitemap and the "Practice" links at the end of lessons read this list.
import { LEVELS, type Level, type TrainerId } from '@mahjong/drills/generate';

export interface TrainerMeta {
  id: TrainerId;
  /** Name on the hub and the page's h1. */
  title: string;
  /** <title> (the site name is appended), written for the search query the trainer targets. */
  seoTitle: string;
  /** Meta description, under ~160 characters. */
  description: string;
  /** One line on the hub. */
  summary: string;
  /** What the drill is, below it on the page (a sentence or two, for readers arriving from search). */
  intro: string;
  /** Lessons that teach the skill: the first is linked from the trainer, all of them link here. */
  lessons: string[];
  /** A label per level, in `LEVELS` order. */
  levels: Record<string, string>;
  /** Levels a Rush climbs through, five solved each. */
  rush: Level[];
}

export const TRAINERS: TrainerMeta[] = [
  {
    id: 'efficiency',
    title: 'Efficiency',
    seoTitle: 'Riichi Mahjong Efficiency Trainer: What to Discard',
    description:
      'Free tile efficiency trainer: discard for the most tiles that improve your hand, then see every discard ranked. Endless hands.',
    summary: 'What do you discard?',
    intro:
      'Discard the tile that keeps the most tiles that bring you closer to tenpai. Afterwards every discard is ranked with the tiles it keeps.',
    lessons: ['tile-efficiency', 'shapes'],
    levels: { easy: 'Easy', normal: 'Normal', hard: 'Hard' },
    rush: [...LEVELS.efficiency],
  },
  {
    id: 'waits',
    title: 'Waits',
    seoTitle: 'Riichi Mahjong Waits Trainer: Find Every Winning Tile',
    description:
      'Practise reading waits: pick every tile that completes a tenpai hand, from everyday hands to one-suit hands with many waits.',
    summary: 'Pick every winning tile',
    intro:
      'A tenpai hand: pick every tile that wins it. One suit hands are the hard level, with three or more winning tiles to find.',
    lessons: ['waits', 'tenpai'],
    levels: { normal: 'Normal', 'one-suit': 'One suit' },
    rush: [...LEVELS.waits],
  },
  {
    id: 'yaku',
    title: 'Yaku',
    seoTitle: 'Riichi Mahjong Yaku Quiz: Name Every Yaku in a Hand',
    description:
      'Name every yaku in a winning riichi mahjong hand, with each yaku and its han shown after you answer. Endless hands.',
    summary: 'Name every yaku in the hand',
    intro: 'A winning hand: pick every yaku it has. Dora are not yaku, so they are not asked.',
    lessons: ['more-yaku', 'first-yaku'],
    levels: { all: 'All' },
    rush: ['all'],
  },
  {
    id: 'score',
    title: 'Scoring',
    seoTitle: 'Riichi Mahjong Scoring Trainer: Han, Fu and Points',
    description:
      'Practise riichi mahjong scoring: the han and fu of a winning hand, the points it wins, or its fu counted step by step.',
    summary: 'Han, fu and points',
    intro: 'A winning hand: say what it is worth in han and fu, or in points, or count its fu part by part.',
    lessons: ['han-and-fu', 'counting-fu', 'payments-and-draws'],
    levels: { 'han-fu': 'Han and fu', points: 'Points', fu: 'Fu' },
    rush: ['han-fu', 'points'],
  },
];

export const trainerById = (id: string): TrainerMeta | undefined => TRAINERS.find((t) => t.id === id);

/** The trainer that practises what a lesson teaches. */
export const trainerForLesson = (slug: string): TrainerMeta | undefined =>
  TRAINERS.find((t) => t.lessons.includes(slug));

/** A fresh seed for the next problem (not part of generation, which only reads seeds). */
export const newSeed = () =>
  Math.floor(Math.random() * 36 ** 6)
    .toString(36)
    .padStart(6, '0');

/** A problem link: trainer, level and seed reproduce it exactly. */
export const problemPath = (id: TrainerId, level: Level, seed: string) =>
  `/train/${id}?${new URLSearchParams({ level, p: seed })}`;
