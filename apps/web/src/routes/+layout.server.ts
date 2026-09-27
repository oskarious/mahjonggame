import type { LayoutServerLoad } from './$types';

// Only public fields reach the page.
export const load: LayoutServerLoad = ({ locals }) => {
  const u = locals.user;
  return { user: u ? { id: u.id, name: u.displayUsername || u.username || u.name } : null };
};
