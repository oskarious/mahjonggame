import { db } from '$lib/server/db';
import { gameServerAvailable } from '$lib/server/game-server';
import type { PageServerLoad } from './$types';

// Signed-in players get the online entry (with their rating) when the game server is up; guests see offline play only.
export const load: PageServerLoad = async ({ locals }) => {
  const u = locals.user;
  if (!u) return { online: null };
  const [available, r] = await Promise.all([
    gameServerAvailable(),
    db.selectFrom('rating').select(['rating', 'games']).where('userId', '=', u.id).executeTakeFirst(),
  ]);
  return { online: available ? { rating: r?.rating ?? 1000, games: r?.games ?? 0 } : null };
};
