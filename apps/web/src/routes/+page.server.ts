import { db } from '$lib/server/db';
import { myVote, tally, todaysDiscard, voteCount, voterOf } from '$lib/server/daily-discard';
import { gameServerAvailable } from '$lib/server/game-server';
import { playingNow, recentGames, week } from '$lib/server/home';
import { utcDate } from '$lib/train/daily';
import type { PageServerLoad } from './$types';

// A content page like Learn (ContentShell, own Seo, no fullscreen toggle).
// Signed-in players get the online entry (with their rating) when the game server is up; guests see offline play only.
// Everyone gets the daily discard (the vote count, and the stats once they have voted) and who is playing now; signed-in
// players also their week and recent games.
export const load: PageServerLoad = async ({ locals, cookies, url }) => {
  const u = locals.user;
  const date = utcDate();
  const discard = async () => {
    const mine = await myVote(date, voterOf(cookies, u, url.protocol === 'https:'));
    const [{ exercise }, votes, t] = await Promise.all([
      todaysDiscard(date),
      voteCount(date),
      mine === null ? null : tally(date),
    ]);
    return { date, exercise, mine, votes, tally: t };
  };
  const shared = () => Promise.all([discard(), playingNow()]);
  if (!u) {
    const [d, playing] = await shared();
    return { contentPage: true, online: null, me: null, discard: d, playing };
  }
  const [available, r, [d, playing], w, recent] = await Promise.all([
    gameServerAvailable(),
    db.selectFrom('rating').select(['rating', 'games']).where('userId', '=', u.id).executeTakeFirst(),
    shared(),
    week(u.id),
    recentGames(u.id),
  ]);
  const rating = r?.rating ?? 1000;
  return {
    contentPage: true,
    online: available ? { rating, games: r?.games ?? 0 } : null,
    me: { rating, week: w, recent },
    discard: d,
    playing,
  };
};
