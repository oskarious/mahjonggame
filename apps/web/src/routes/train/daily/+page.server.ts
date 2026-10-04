import { dailySet, utcDate } from '$lib/train/daily';
import type { PageServerLoad } from './$types';

// The same five problems for everyone on a UTC day; generated once per day per server process.
let cache: { date: string; problems: ReturnType<typeof dailySet> } | null = null;

export const load: PageServerLoad = () => {
  const date = utcDate();
  if (cache?.date !== date) cache = { date, problems: dailySet(date) };
  return { date, problems: cache.problems };
};
