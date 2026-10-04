// The daily set: the same five problems for every visitor on a UTC day.
import { type Level, type TrainerId, generate } from '@mahjong/drills/generate';

export const DAILY: { trainer: TrainerId; level: Level }[] = [
  { trainer: 'efficiency', level: 'normal' },
  { trainer: 'waits', level: 'normal' },
  { trainer: 'yaku', level: 'all' },
  { trainer: 'efficiency', level: 'hard' },
  { trainer: 'score', level: 'han-fu' },
];

/** YYYY-MM-DD in UTC. */
export const utcDate = (d = new Date()) => d.toISOString().slice(0, 10);

/** The day's problems, in order. */
export function dailySet(date: string) {
  return DAILY.map((p, i) => ({ ...p, exercise: generate(p.trainer, p.level, `daily/${date}/${i}`) }));
}

/** One mark per problem: right or missed. */
const MARK = { right: '●', missed: '○' } as const;

/** The text a reader can paste anywhere: date, a mark per problem, the score. */
export function shareLine(date: string, results: boolean[], url: string): string {
  const marks = results.map((r) => (r ? MARK.right : MARK.missed)).join('');
  return `Riichi Arena daily ${date} ${marks} ${results.filter(Boolean).length}/${results.length}\n${url}`;
}
