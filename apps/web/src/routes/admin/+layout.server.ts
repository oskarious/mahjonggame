import { requireAdmin } from '$lib/server/admin';
import type { LayoutServerLoad } from './$types';

// Everything under /admin is a 404 for non-admins. Form actions check again (layout loads do not guard actions).
export const load: LayoutServerLoad = ({ locals }) => {
  requireAdmin(locals);
};
