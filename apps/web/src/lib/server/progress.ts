import { sql } from 'kysely';
import { exercisesOf } from '$lib/learn/content';
import { readProgress } from '$lib/learn/progress-data';
import { LESSONS } from '$lib/learn/registry';
import { type Catalog, type Docs, type ProgressEvent, applyEvent, emptyDocs, mergeDocs } from '$lib/progress/events';
import { DAILY } from '$lib/train/daily';
import { TRAINERS } from '$lib/train/registry';
import { readTrain } from '$lib/train/stats-data';
import { db } from './db';

/** Every lesson (drafts too: dev shows them) with its sets' variant counts, the trainers and the daily set's size. */
export const CATALOG: Catalog = {
  lessons: Object.fromEntries(
    LESSONS.map((l) => [
      l.slug,
      Object.fromEntries(Object.entries(exercisesOf(l.slug)).map(([id, s]) => [id, s.length])),
    ]),
  ),
  trainers: TRAINERS.map((t) => t.id),
  dailySize: DAILY.length,
};

/** The player's progress; empty when they have none yet. */
export async function getProgress(userId: string): Promise<Docs> {
  const row = await db
    .selectFrom('user_progress')
    .select(['learn', 'train'])
    .where('userId', '=', userId)
    .executeTakeFirst();
  return row ? { learn: readProgress(row.learn), train: readTrain(row.train) } : emptyDocs();
}

/** Changes the player's progress under a row lock, so concurrent requests (tabs, devices) apply one after another. */
async function change(userId: string, f: (d: Docs) => void): Promise<void> {
  await db.transaction().execute(async (tx) => {
    const empty = emptyDocs();
    await tx
      .insertInto('user_progress')
      .values({ userId, learn: JSON.stringify(empty.learn), train: JSON.stringify(empty.train) })
      .onConflict((oc) => oc.column('userId').doNothing())
      .execute();
    const row = await tx
      .selectFrom('user_progress')
      .select(['learn', 'train'])
      .where('userId', '=', userId)
      .forUpdate()
      .executeTakeFirstOrThrow();
    const d = { learn: readProgress(row.learn), train: readTrain(row.train) };
    f(d);
    await tx
      .updateTable('user_progress')
      .set({ learn: JSON.stringify(d.learn), train: JSON.stringify(d.train), updatedAt: sql`CURRENT_TIMESTAMP` })
      .where('userId', '=', userId)
      .execute();
  });
}

/** Applies checked events in order. */
export const applyEvents = (userId: string, events: ProgressEvent[]) =>
  change(userId, (d) => events.forEach((e) => applyEvent(d, e, CATALOG.dailySize)));

/** Adds a checked snapshot (a claimed visit or imported device progress). */
export const mergeProgress = (userId: string, from: Docs) => change(userId, (d) => mergeDocs(d, from));
