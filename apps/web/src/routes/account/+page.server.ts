import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const u = locals.user;
  if (!u) redirect(303, '/login?next=/account');
  // No row until the first online game: a new player is 1000 with 0 rated games.
  const r = await db.selectFrom('rating').select(['rating', 'games']).where('userId', '=', u.id).executeTakeFirst();
  return { email: u.email, rating: r?.rating ?? 1000, games: r?.games ?? 0 };
};
