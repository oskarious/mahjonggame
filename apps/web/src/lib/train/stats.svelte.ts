// Trainer stats: per trainer and the daily set. The reader's (the account's, or a guest's for this visit): see
// progress/client.svelte.ts.
import type { TrainerId } from '@mahjong/drills/generate';
import { docs, progressLoaded, record } from '../progress/client.svelte';
import { type TrainerStats, dailyStreak as streakIn, statsIn } from './stats-data';

/** Whether stats have been read (the page shows none until then). */
export const statsLoaded = progressLoaded;

export const statsOf = (id: TrainerId): TrainerStats => statsIn(docs().train, id);

/** A Practice answer: counts toward accuracy and the streak only when right the first time. */
export const recordAnswer = (id: TrainerId, firstTry: boolean) => record({ kind: 'answer', trainer: id, firstTry });

/** A finished Rush; returns whether it is a new best. */
export function recordRush(id: TrainerId, score: number): boolean {
  const best = score > statsOf(id).rushBest;
  record({ kind: 'rush', trainer: id, score });
  return best;
}

export const dailyOf = (date: string): boolean[] => docs().train.daily[date] ?? [];

export const recordDaily = (date: string, right: boolean) => record({ kind: 'daily', date, right });

/** Consecutive finished days up to `date` (today not finished yet doesn't break it). */
export const dailyStreak = (date: string, size: number): number => streakIn(docs().train, date, size);
