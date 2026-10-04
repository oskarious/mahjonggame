import { db } from '$lib/server/db';
import { myVote, tally, todaysDiscard, voterOf } from '$lib/server/daily-discard';
import { gameServerAvailable } from '$lib/server/game-server';
import { utcDate } from '$lib/train/daily';
import type { PageServerLoad } from './$types';

// Signed-in players get the online entry (with their rating) when the game server is up; guests see offline play only.
// Everyone gets the daily discard, with its stats once they have voted.
export const load: PageServerLoad = async ({ locals, cookies, url }) => {
  const u = locals.user;
  const date = utcDate();
  const discard = async () => {
    const mine = await myVote(date, voterOf(cookies, u, url.protocol === 'https:'));
    return { date, exercise: (await todaysDiscard(date)).exercise, mine, tally: mine === null ? null : await tally(date) };
  };
  if (!u) return { online: null, discard: await discard() };
  const [available, r, d] = await Promise.all([
    gameServerAvailable(),
    db.selectFrom('rating').select(['rating', 'games']).where('userId', '=', u.id).executeTakeFirst(),
    discard(),
  ]);
  return { online: available ? { rating: r?.rating ?? 1000, games: r?.games ?? 0 } : null, discard: d };
};
