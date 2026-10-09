import { describe, expect, it } from 'vitest';
import { type Catalog, MAX_EVENTS, applyEvent, emptyDocs, isEmptyDocs, mergeDocs, parseRequest } from './events';

const catalog: Catalog = {
  lessons: { tiles: { a: 3, b: 1 }, waits: {} },
  trainers: ['efficiency', 'waits'],
  dailySize: 5,
};
const today = '2026-10-05';

describe('parseRequest: events', () => {
  it('accepts known lessons, sets, variants, trainers and days, stripping extra fields', () => {
    const body = {
      events: [
        { kind: 'read', slug: 'waits', extra: 1 },
        { kind: 'solved', slug: 'tiles', id: 'a', variant: 2 },
        { kind: 'answer', trainer: 'waits', firstTry: false },
        { kind: 'rush', trainer: 'efficiency', score: 12 },
        { kind: 'daily', date: today, right: true },
      ],
    };
    expect(parseRequest(body, catalog, today)).toEqual({
      events: [
        { kind: 'read', slug: 'waits' },
        { kind: 'solved', slug: 'tiles', id: 'a', variant: 2 },
        { kind: 'answer', trainer: 'waits', firstTry: false },
        { kind: 'rush', trainer: 'efficiency', score: 12 },
        { kind: 'daily', date: today, right: true },
      ],
    });
  });

  it.each([
    ['an unknown lesson', { kind: 'read', slug: 'nope' }],
    ['an unknown exercise id', { kind: 'solved', slug: 'tiles', id: 'c', variant: 0 }],
    ['a variant out of range', { kind: 'solved', slug: 'tiles', id: 'b', variant: 1 }],
    ['an inherited key', { kind: 'solved', slug: 'tiles', id: 'toString', variant: 0 }],
    ['an unknown trainer', { kind: 'answer', trainer: 'nope', firstTry: true }],
    ['an old daily date', { kind: 'daily', date: '2026-10-01', right: true }],
    ['a malformed event', { kind: 'answer', trainer: 'waits', firstTry: 'yes' }],
    ['an unknown kind', { kind: 'win' }],
  ])('refuses the whole request for %s', (_, bad) => {
    expect(parseRequest({ events: [{ kind: 'read', slug: 'waits' }, bad] }, catalog, today)).toBeNull();
  });

  it('refuses empty and oversized batches and other bodies', () => {
    expect(parseRequest({ events: [] }, catalog, today)).toBeNull();
    const many = Array.from({ length: MAX_EVENTS + 1 }, () => ({ kind: 'read', slug: 'waits' }));
    expect(parseRequest({ events: many }, catalog, today)).toBeNull();
    expect(parseRequest(null, catalog, today)).toBeNull();
    expect(parseRequest({ hello: 1 }, catalog, today)).toBeNull();
  });
});

describe('parseRequest: merge', () => {
  it('keeps what exists and drops the rest', () => {
    const body = {
      merge: {
        learn: {
          v: 2,
          lessons: { tiles: { read: true, solved: { a: [0, 2, 3, 7, 2], c: [0] } }, gone: { read: true, solved: {} } },
        },
        train: { v: 1, trainers: { waits: { answered: 2, firstTry: 1, streak: 0, bestStreak: 1, rushBest: 0 } }, daily: {} },
      },
    };
    expect(parseRequest(body, catalog, today)).toEqual({
      merge: {
        learn: { v: 2, lessons: { tiles: { read: true, solved: { a: [0, 2] } } } },
        train: { v: 1, trainers: { waits: { answered: 2, firstTry: 1, streak: 0, bestStreak: 1, rushBest: 0 } }, daily: {} },
      },
    });
  });

  it('upgrades old-format course progress (an id counts as its first variant)', () => {
    const body = { merge: { learn: { v: 1, lessons: { tiles: { solved: ['a', 'b'] } } } } };
    expect(parseRequest(body, catalog, today)).toEqual({
      merge: { learn: { v: 2, lessons: { tiles: { solved: { a: [0], b: [0] } } } }, train: emptyDocs().train },
    });
  });
});

describe('applying and merging', () => {
  it('applies events in order across both documents', () => {
    const d = emptyDocs();
    expect(isEmptyDocs(d)).toBe(true);
    applyEvent(d, { kind: 'solved', slug: 'tiles', id: 'a', variant: 1 }, 5);
    applyEvent(d, { kind: 'solved', slug: 'tiles', id: 'a', variant: 1 }, 5);
    applyEvent(d, { kind: 'answer', trainer: 'waits', firstTry: true }, 5);
    expect(d.learn.lessons.tiles).toEqual({ solved: { a: [1] } });
    expect(d.train.trainers.waits?.answered).toBe(1);
    expect(isEmptyDocs(d)).toBe(false);
  });

  it('two tabs: events from both are kept, whatever the order', () => {
    const tabA = [{ kind: 'answer', trainer: 'efficiency', firstTry: true }] as const;
    const tabB = [{ kind: 'answer', trainer: 'waits', firstTry: true }] as const;
    const d = emptyDocs();
    for (const e of [...tabB, ...tabA, ...tabB]) applyEvent(d, e, 5);
    expect(d.train.trainers.efficiency?.answered).toBe(1);
    expect(d.train.trainers.waits?.answered).toBe(2);
  });

  it('merges a visit into an account: unions of read lessons and solved variants', () => {
    const account = emptyDocs();
    applyEvent(account, { kind: 'solved', slug: 'tiles', id: 'a', variant: 0 }, 5);
    const visit = emptyDocs();
    applyEvent(visit, { kind: 'read', slug: 'tiles' }, 5);
    applyEvent(visit, { kind: 'solved', slug: 'tiles', id: 'a', variant: 2 }, 5);
    applyEvent(visit, { kind: 'solved', slug: 'tiles', id: 'a', variant: 0 }, 5);
    mergeDocs(account, visit);
    expect(account.learn.lessons.tiles).toEqual({ read: true, solved: { a: [0, 2] } });
  });
});
