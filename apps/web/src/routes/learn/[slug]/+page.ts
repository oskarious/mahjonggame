import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { exercisesOf, loadArticle } from '$lib/learn/content';
import { LESSONS, UNITS, lessonBySlug, neighbours } from '$lib/learn/registry';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, url }) => {
  const meta = lessonBySlug(params.slug, dev);
  const article = meta ? await loadArticle(meta.slug) : null;
  if (!meta || !article) error(404, 'Lesson not found');
  const related = meta.related.map((s) => lessonBySlug(s, dev)).filter((l) => !!l);
  return {
    meta,
    unit: UNITS.find((u) => u.id === meta.unit)!,
    article,
    exercises: exercisesOf(meta.slug),
    ...neighbours(meta.slug, dev),
    related,
    position: LESSONS.indexOf(meta) + 1,
    // The part to show (1-based); clamped by the lesson, which knows how many parts it has.
    step: Number(url.searchParams.get('step')) || 1,
  };
};
