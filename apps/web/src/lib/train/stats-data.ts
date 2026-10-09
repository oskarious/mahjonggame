// Trainer stats: their shape, reading them, and the changes to them. Shared by the client store and the server (which
// stores them on the account), so kept free of runes and $lib imports.
import type { TrainerId } from '@mahjong/drills/generate';

export interface TrainerStats {
  answered: number;
  /** Right on the first answer. */
  firstTry: number;
  streak: number;
  bestStreak: number;
  rushBest: number;
}

export interface TrainData {
  v: 1;
  trainers: Partial<Record<TrainerId, TrainerStats>>;
  /** Per UTC date: the results so far, in order. */
  daily: Record<string, boolean[]>;
}

export type TrainEvent =
  | { kind: 'answer'; trainer: TrainerId; firstTry: boolean }
  | { kind: 'rush'; trainer: TrainerId; score: number }
  | { kind: 'daily'; date: string; right: boolean };

/** What exists to train: the trainer ids and the daily set's size. */
export interface TrainCatalog {
  trainers: readonly string[];
  dailySize: number;
}

export const EMPTY_STATS: TrainerStats = { answered: 0, firstTry: 0, streak: 0, bestStreak: 0, rushBest: 0 };

export const emptyTrain = (): TrainData => ({ v: 1, trainers: {}, daily: {} });

const isRecord = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const count = (x: unknown) => (Number.isInteger(x) && (x as number) >= 0 ? (x as number) : 0);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Device stats stored by earlier versions (`riichi:train`); anything unreadable is empty. */
export function parseStats(raw: string | null): TrainData {
  try {
    return readTrain(raw ? JSON.parse(raw) : null);
  } catch {
    return emptyTrain();
  }
}

/** Stats as stored; anything else is empty. */
export function readTrain(parsed: unknown): TrainData {
  return isRecord(parsed) && parsed.v === 1 && isRecord(parsed.trainers) && isRecord(parsed.daily)
    ? (parsed as unknown as TrainData)
    : emptyTrain();
}

/** Untrusted stats (a claim or an import) reduced to known trainers, whole counts and past or current days. */
export function cleanTrain(input: unknown, catalog: TrainCatalog, today: string): TrainData {
  const d = readTrain(input);
  const out = emptyTrain();
  for (const [id, s] of Object.entries(d.trainers)) {
    if (!catalog.trainers.includes(id) || !isRecord(s)) continue;
    const answered = count(s.answered);
    out.trainers[id as TrainerId] = {
      answered,
      firstTry: Math.min(count(s.firstTry), answered),
      streak: Math.min(count(s.streak), answered),
      bestStreak: Math.min(count(s.bestStreak), answered),
      rushBest: count(s.rushBest),
    };
  }
  for (const [date, rs] of Object.entries(d.daily)) {
    if (!DATE.test(date) || date > today || !Array.isArray(rs)) continue;
    const ok = rs.filter((r) => typeof r === 'boolean').slice(0, catalog.dailySize);
    if (ok.length) out.daily[date] = ok;
  }
  return out;
}

/** The UTC day before `date` (YYYY-MM-DD). */
export function dayBefore(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Whether a well-formed event names a known trainer, a whole score, or today's or yesterday's daily set (open over
 * midnight).
 */
export function validTrainEvent(e: TrainEvent, catalog: TrainCatalog, today: string): boolean {
  if (e.kind === 'daily') return e.date === today || e.date === dayBefore(today);
  if (!catalog.trainers.includes(e.trainer)) return false;
  return e.kind === 'answer' || (Number.isInteger(e.score) && e.score >= 0);
}

export const statsIn = (d: TrainData, id: TrainerId): TrainerStats => d.trainers[id] ?? EMPTY_STATS;

/** Applies one change in place; a daily answer beyond the set's size is ignored. */
export function applyTrain(d: TrainData, e: TrainEvent, dailySize: number): void {
  if (e.kind === 'daily') {
    const rs = d.daily[e.date] ?? [];
    if (rs.length < dailySize) d.daily[e.date] = [...rs, e.right];
    return;
  }
  const s = { ...statsIn(d, e.trainer) };
  if (e.kind === 'rush') s.rushBest = Math.max(s.rushBest, e.score);
  else {
    s.answered++;
    if (e.firstTry) {
      s.firstTry++;
      s.streak++;
      s.bestStreak = Math.max(s.bestStreak, s.streak);
    } else s.streak = 0;
  }
  d.trainers[e.trainer] = s;
}

/**
 * Adds `from` into `into` in place: answers summed, bests the higher, the current streak `into`'s (or `from`'s for a
 * trainer `into` never answered), and the daily results of the days `into` has none for.
 */
export function mergeTrain(into: TrainData, from: TrainData): void {
  for (const [id, f] of Object.entries(from.trainers) as [TrainerId, TrainerStats][]) {
    const s = statsIn(into, id);
    into.trainers[id] = {
      answered: s.answered + f.answered,
      firstTry: s.firstTry + f.firstTry,
      streak: s.answered ? s.streak : f.streak,
      bestStreak: Math.max(s.bestStreak, f.bestStreak),
      rushBest: Math.max(s.rushBest, f.rushBest),
    };
  }
  for (const [date, rs] of Object.entries(from.daily)) {
    if (!into.daily[date]?.length) into.daily[date] = [...rs];
  }
}

/** Consecutive finished days up to `date` (today not finished yet doesn't break it). */
export function dailyStreak(d: TrainData, date: string, size: number): number {
  const done = (day: string) => (d.daily[day]?.length ?? 0) >= size;
  let day = done(date) ? date : dayBefore(date);
  let n = 0;
  while (done(day)) {
    n++;
    day = dayBefore(day);
  }
  return n;
}
