import { error } from '@sveltejs/kit';
import { LEVELS, generate, isLevel } from '$lib/train/generate';
import { newSeed, trainerById } from '$lib/train/registry';
import type { PageServerLoad } from './$types';

// The first problem is generated here, so it is in the HTML (search engines, no layout shift) and the browser
// hydrates the same one. `?p=` (with `level`) reproduces a shared problem.
export const load: PageServerLoad = ({ params, url }) => {
  const meta = trainerById(params.trainer);
  if (!meta) error(404, 'Trainer not found');
  const asked = url.searchParams.get('level') ?? '';
  const level = isLevel(meta.id, asked) ? asked : LEVELS[meta.id][0];
  const p = url.searchParams.get('p') ?? '';
  const seed = /^[\w/-]{1,40}$/.test(p) ? p : newSeed();
  return {
    id: meta.id,
    level,
    mode: url.searchParams.get('mode') === 'rush' ? ('rush' as const) : ('practice' as const),
    seed,
    exercise: generate(meta.id, level, seed),
  };
};
