import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
  const u = locals.user;
  if (!u) redirect(303, '/login?next=/account');
  return { email: u.email };
};
