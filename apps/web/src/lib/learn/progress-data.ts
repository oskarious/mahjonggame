// Course progress: its shape, reading it, and the changes to it. Shared by the client store and the server (which
// stores it on the account), so kept free of runes and $lib imports.

export interface LessonProgress {
  read?: true;
  /** Per exercise id: the indexes of the variants answered right. */
  solved: Record<string, number[]>;
}

export interface Progress {
  v: 2;
  lessons: Record<string, LessonProgress>;
}

/** v1 kept solved exercise ids from before exercises had variants: each counts as its first variant. */
interface ProgressV1 {
  v: 1;
  lessons: Record<string, { read?: true; solved: string[] }>;
}

export type LearnEvent = { kind: 'read'; slug: string } | { kind: 'solved'; slug: string; id: string; variant: number };

/** The lessons that exist: per slug, each exercise set's variant count. */
export type LessonCatalog = Record<string, Record<string, number>>;

export const emptyProgress = (): Progress => ({ v: 2, lessons: {} });

const isRecord = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

/** Device progress stored by earlier versions (`riichi:learn`), upgraded; anything unreadable is empty progress. */
export function parseProgress(raw: string | null): Progress {
  try {
    return readProgress(raw ? JSON.parse(raw) : null);
  } catch {
    return emptyProgress();
  }
}

/** Progress as stored (v2) or in the old format (v1), upgraded; anything else is empty progress. */
export function readProgress(parsed: unknown): Progress {
  if (!isRecord(parsed) || !isRecord(parsed.lessons)) return emptyProgress();
  if (parsed.v === 2) return parsed as unknown as Progress;
  if (parsed.v !== 1) return emptyProgress();
  const old = parsed as unknown as ProgressV1;
  const lessons: Record<string, LessonProgress> = {};
  for (const [slug, e] of Object.entries(old.lessons)) {
    if (!isRecord(e)) continue;
    const ids = Array.isArray(e.solved) ? e.solved.filter((id) => typeof id === 'string') : [];
    lessons[slug] = { ...(e.read ? { read: true } : {}), solved: Object.fromEntries(ids.map((id) => [id, [0]])) };
  }
  return { v: 2, lessons };
}

/**
 * Untrusted progress (a claim or an import) reduced to what exists: known lessons, exercise ids and variants, of the
 * right types. Lessons or exercises removed since are dropped rather than refused.
 */
export function cleanProgress(input: unknown, catalog: LessonCatalog): Progress {
  const p = readProgress(input);
  const out = emptyProgress();
  for (const [slug, e] of Object.entries(p.lessons)) {
    const sets = Object.hasOwn(catalog, slug) ? catalog[slug] : undefined;
    if (!sets || !isRecord(e)) continue;
    const solved: Record<string, number[]> = {};
    if (isRecord(e.solved)) {
      for (const [id, vs] of Object.entries(e.solved)) {
        if (!Object.hasOwn(sets, id) || !Array.isArray(vs)) continue;
        const ok = [...new Set(vs)].filter((v): v is number => Number.isInteger(v) && v >= 0 && v < sets[id]);
        if (ok.length) solved[id] = ok;
      }
    }
    out.lessons[slug] = { ...(e.read === true ? { read: true } : {}), solved };
  }
  return out;
}

/** Whether a well-formed event names an existing lesson (and exercise set and variant). */
export function validLearnEvent(e: LearnEvent, catalog: LessonCatalog): boolean {
  const sets = Object.hasOwn(catalog, e.slug) ? catalog[e.slug] : undefined;
  if (!sets) return false;
  if (e.kind === 'read') return true;
  return Object.hasOwn(sets, e.id) && Number.isInteger(e.variant) && e.variant >= 0 && e.variant < sets[e.id];
}

// Reads the entry back through `p`: on a runes proxy, `??=` returns the plain object and changes to it would bypass it.
function entry(p: Progress, slug: string): LessonProgress {
  p.lessons[slug] ??= { solved: {} };
  return p.lessons[slug];
}

/** Applies one change in place. */
export function applyLearn(p: Progress, e: LearnEvent): void {
  const l = entry(p, e.slug);
  if (e.kind === 'read') {
    l.read = true;
    return;
  }
  l.solved[e.id] ??= [];
  if (!l.solved[e.id].includes(e.variant)) l.solved[e.id].push(e.variant);
}

/** Adds `from` into `into` in place: lessons read and variants solved in either. */
export function mergeLearn(into: Progress, from: Progress): void {
  for (const [slug, e] of Object.entries(from.lessons)) {
    if (e.read) applyLearn(into, { kind: 'read', slug });
    for (const [id, vs] of Object.entries(e.solved)) {
      for (const variant of vs) applyLearn(into, { kind: 'solved', slug, id, variant });
    }
  }
}

/** Every variant of the set answered right. */
export function setSolved(e: LessonProgress | undefined, id: string, variants: number): boolean {
  const done = e?.solved[id] ?? [];
  return Array.from({ length: variants }, (_, i) => i).every((i) => done.includes(i));
}

/** Read to the end with every set solved; `sets` gives each exercise id's variant count. */
export function lessonCompleted(e: LessonProgress | undefined, sets: Record<string, number>): boolean {
  return !!e?.read && Object.entries(sets).every(([id, n]) => setSolved(e, id, n));
}
