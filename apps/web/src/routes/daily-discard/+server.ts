import { error, json } from '@sveltejs/kit';
import { utcDate } from '$lib/train/daily';
import { tally, todaysDiscard, vote, voterOf } from '$lib/server/daily-discard';
import type { RequestHandler } from './$types';

// A vote for today's discard; answers with the stats (only voters get them).
export const POST: RequestHandler = async ({ request, cookies, locals, url }) => {
  const body = (await request.json().catch(() => null)) as { date?: unknown; kind?: unknown } | null;
  const date = utcDate();
  // A ballot from yesterday's page (open across midnight UTC): the hand has changed.
  if (body?.date !== date) error(409, 'New hand');
  const { kinds } = await todaysDiscard(date);
  const kind = body.kind;
  if (typeof kind !== 'number' || !kinds.has(kind)) error(400, 'Not in the hand');
  const voter = voterOf(cookies, locals.user, url.protocol === 'https:', true);
  const mine = await vote(date, voter, kind);
  return json({ mine, tally: await tally(date) });
};
