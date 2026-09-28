import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Online play needs an account: the game server identifies the player from the session cookie.
export const load: PageServerLoad = ({ locals }) => {
  if (!locals.user) redirect(303, '/login?next=/online');
  return {};
};
