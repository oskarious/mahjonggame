import { redirect } from '@sveltejs/kit';
import { safeNext } from '$lib/safe-next';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
  if (locals.user) redirect(303, safeNext(url.searchParams.get('next')));
};
