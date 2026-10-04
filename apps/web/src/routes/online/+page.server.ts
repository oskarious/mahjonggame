import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Online play needs an account: the game server identifies the player from the session cookie. Guests are most likely
// new, so they get the sign-up page (which links to sign-in).
export const load: PageServerLoad = ({ locals }) => {
  if (!locals.user) redirect(303, '/signup?next=/online');
  return {};
};
