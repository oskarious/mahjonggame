// A player's progress (course and trainers) and the requests that change it on the account: events applied in order,
// or a merge (a guest's visit claimed at sign-up or sign-in, or progress imported from device storage). Shared by the
// client store and the server, so free of runes and $lib imports.
import type { TrainerId } from '@mahjong/drills/generate';
import {
  type LearnEvent,
  type LessonCatalog,
  type Progress,
  applyLearn,
  cleanProgress,
  emptyProgress,
  mergeLearn,
  validLearnEvent,
} from '../learn/progress-data';
import {
  type TrainCatalog,
  type TrainData,
  type TrainEvent,
  applyTrain,
  cleanTrain,
  emptyTrain,
  mergeTrain,
  validTrainEvent,
} from '../train/stats-data';

export type ProgressEvent = LearnEvent | TrainEvent;

export interface Docs {
  learn: Progress;
  train: TrainData;
}

export interface Catalog extends TrainCatalog {
  lessons: LessonCatalog;
}

export type ProgressRequest = { events: ProgressEvent[] } | { merge: Docs };

/** Events per request; the client sends at most this many at a time. */
export const MAX_EVENTS = 100;

export const emptyDocs = (): Docs => ({ learn: emptyProgress(), train: emptyTrain() });

export const isEmptyDocs = (d: Docs) =>
  !Object.keys(d.learn.lessons).length && !Object.keys(d.train.trainers).length && !Object.keys(d.train.daily).length;

const isRecord = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const str = (x: unknown): x is string => typeof x === 'string';
const num = (x: unknown): x is number => typeof x === 'number';
const bool = (x: unknown): x is boolean => typeof x === 'boolean';

/** One event of the right shape, with nothing else in it; null otherwise. */
function readEvent(x: unknown): ProgressEvent | null {
  if (!isRecord(x)) return null;
  switch (x.kind) {
    case 'read':
      return str(x.slug) ? { kind: 'read', slug: x.slug } : null;
    case 'solved':
      return str(x.slug) && str(x.id) && num(x.variant)
        ? { kind: 'solved', slug: x.slug, id: x.id, variant: x.variant }
        : null;
    case 'answer':
      return str(x.trainer) && bool(x.firstTry)
        ? { kind: 'answer', trainer: x.trainer as TrainerId, firstTry: x.firstTry }
        : null;
    case 'rush':
      return str(x.trainer) && num(x.score) ? { kind: 'rush', trainer: x.trainer as TrainerId, score: x.score } : null;
    case 'daily':
      return str(x.date) && bool(x.right) ? { kind: 'daily', date: x.date, right: x.right } : null;
    default:
      return null;
  }
}

const isLearn = (e: ProgressEvent): e is LearnEvent => e.kind === 'read' || e.kind === 'solved';

/** Whether the event names things that exist (`today` is the server's UTC date). */
export function validEvent(e: ProgressEvent, catalog: Catalog, today: string): boolean {
  return isLearn(e) ? validLearnEvent(e, catalog.lessons) : validTrainEvent(e, catalog, today);
}

/**
 * A request body, checked: events must all be well-formed and name existing lessons, sets, variants, trainers and
 * days (else the whole request is refused: null); a merge is reduced to what exists.
 */
export function parseRequest(body: unknown, catalog: Catalog, today: string): ProgressRequest | null {
  if (!isRecord(body)) return null;
  if (Array.isArray(body.events)) {
    if (!body.events.length || body.events.length > MAX_EVENTS) return null;
    const events: ProgressEvent[] = [];
    for (const x of body.events) {
      const e = readEvent(x);
      if (!e || !validEvent(e, catalog, today)) return null;
      events.push(e);
    }
    return { events };
  }
  if (isRecord(body.merge)) {
    return {
      merge: {
        learn: cleanProgress(body.merge.learn, catalog.lessons),
        train: cleanTrain(body.merge.train, catalog, today),
      },
    };
  }
  return null;
}

/** Applies one event in place; the server caps daily answers at the set's size (the client never exceeds it). */
export function applyEvent(d: Docs, e: ProgressEvent, dailySize = Infinity): void {
  if (isLearn(e)) applyLearn(d.learn, e);
  else applyTrain(d.train, e, dailySize);
}

/** Adds `from` into `into` in place. */
export function mergeDocs(into: Docs, from: Docs): void {
  mergeLearn(into.learn, from.learn);
  mergeTrain(into.train, from.train);
}
