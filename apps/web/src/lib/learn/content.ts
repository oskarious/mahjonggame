import type { Component } from 'svelte';
import type { Exercise } from '@mahjong/drills/types';

// Each lesson is lessons/<slug>/Lesson.svelte (the article) + exercises.ts (its exercises as data).
// Articles load lazily, one per page; exercise data is small and loaded eagerly (the index needs the ids).
const articles = import.meta.glob<Component>('./lessons/*/Lesson.svelte', {
  import: 'default',
});
const exerciseFiles = import.meta.glob<Record<string, Exercise>>('./lessons/*/exercises.ts', {
  import: 'exercises',
  eager: true,
});

const slugOf = (path: string) => path.split('/')[2];

const EXERCISES: Record<string, Record<string, Exercise>> = Object.fromEntries(
  Object.entries(exerciseFiles).map(([p, ex]) => [slugOf(p), ex]),
);

export function exercisesOf(slug: string): Record<string, Exercise> {
  return EXERCISES[slug] ?? {};
}

export async function loadArticle(slug: string): Promise<Component | null> {
  const load = articles[`./lessons/${slug}/Lesson.svelte`];
  return load ? load() : null;
}
