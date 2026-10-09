// Course progress: lessons read to the end and exercise variants solved, by slug and id. The reader's (the account's,
// or a guest's for this visit): see progress/client.svelte.ts.
import { docs, record } from '../progress/client.svelte';
import { lessonCompleted } from './progress-data';

/** The variants of an exercise set answered right (indexes). */
export const solvedVariants = (slug: string, id: string): number[] => docs().learn.lessons[slug]?.solved[id] ?? [];

export function markSolved(slug: string, id: string, variant: number): void {
  if (!solvedVariants(slug, id).includes(variant)) record({ kind: 'solved', slug, id, variant });
}

export function markRead(slug: string): void {
  if (!docs().learn.lessons[slug]?.read) record({ kind: 'read', slug });
}

/** Read to the end with every exercise set solved; `sets` gives each id's variant count. */
export const completed = (slug: string, sets: Record<string, number>): boolean =>
  lessonCompleted(docs().learn.lessons[slug], sets);
