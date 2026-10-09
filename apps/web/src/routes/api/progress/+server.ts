import { error, json } from '@sveltejs/kit';
import { parseRequest } from '$lib/progress/events';
import { CATALOG, applyEvents, getProgress, mergeProgress } from '$lib/server/progress';
import { utcDate } from '$lib/train/daily';
import type { RequestHandler } from './$types';

// The signed-in player's progress (course and trainers). Guests have none on the server: theirs lasts the visit.
const NO_STORE = { 'Cache-Control': 'no-store' };

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) error(401, 'Sign in');
  return json(await getProgress(locals.user.id), { headers: NO_STORE });
};

/** `{ events }`, applied in order (refused whole if any names something unknown), or `{ merge }`. */
export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) error(401, 'Sign in');
  const req = parseRequest(await request.json().catch(() => null), CATALOG, utcDate());
  if (!req) error(400, 'Bad progress');
  if ('events' in req) await applyEvents(locals.user.id, req.events);
  else await mergeProgress(locals.user.id, req.merge);
  return new Response(null, { status: 204, headers: NO_STORE });
};
