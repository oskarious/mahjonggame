// Trainer stats on this device only (no account): per trainer and the daily set. Loaded on mount, so server-rendered
// HTML never depends on it; storage errors are ignored (a private window simply keeps nothing).
import type { TrainerId } from './generate';

const KEY = 'riichi:train';

export interface TrainerStats {
  answered: number;
  /** Right on the first answer. */
  firstTry: number;
  streak: number;
  bestStreak: number;
  rushBest: number;
}

interface Stored {
  v: 1;
  trainers: Partial<Record<TrainerId, TrainerStats>>;
  /** Per UTC date: the results so far, in order. */
  daily: Record<string, boolean[]>;
}

const EMPTY: TrainerStats = { answered: 0, firstTry: 0, streak: 0, bestStreak: 0, rushBest: 0 };

const state: { data: Stored; loaded: boolean } = $state({ data: { v: 1, trainers: {}, daily: {} }, loaded: false });

export function loadStats(): void {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Stored) : null;
    if (parsed?.v === 1 && parsed.trainers && parsed.daily) state.data = parsed;
  } catch {
    /* unavailable or unreadable: start empty */
  }
  state.loaded = true;
}

function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state.data));
  } catch {
    /* storage unavailable */
  }
}

/** Whether stats have been read (the page shows none until then). */
export const statsLoaded = () => state.loaded;

export const statsOf = (id: TrainerId): TrainerStats => state.data.trainers[id] ?? EMPTY;

/** A Practice answer: counts toward accuracy and the streak only when right the first time. */
export function recordAnswer(id: TrainerId, firstTryRight: boolean): void {
  const s = { ...statsOf(id) };
  s.answered++;
  if (firstTryRight) {
    s.firstTry++;
    s.streak++;
    s.bestStreak = Math.max(s.bestStreak, s.streak);
  } else s.streak = 0;
  state.data.trainers[id] = s;
  save();
}

/** A finished Rush; returns whether it is a new best. */
export function recordRush(id: TrainerId, score: number): boolean {
  const s = { ...statsOf(id) };
  const best = score > s.rushBest;
  if (best) s.rushBest = score;
  state.data.trainers[id] = s;
  save();
  return best;
}

export const dailyOf = (date: string): boolean[] => state.data.daily[date] ?? [];

export function recordDaily(date: string, right: boolean): void {
  state.data.daily[date] = [...dailyOf(date), right];
  save();
}

/** Consecutive finished days up to `date` (today not finished yet doesn't break it). */
export function dailyStreak(date: string, size: number): number {
  const done = (d: string) => (state.data.daily[d]?.length ?? 0) >= size;
  const day = new Date(`${date}T00:00:00Z`);
  if (!done(date)) day.setUTCDate(day.getUTCDate() - 1);
  let n = 0;
  while (done(day.toISOString().slice(0, 10))) {
    n++;
    day.setUTCDate(day.getUTCDate() - 1);
  }
  return n;
}
