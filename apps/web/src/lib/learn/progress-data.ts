// The stored shape of course progress (`riichi:learn`) and reading it, kept free of runes so it can be unit tested.

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

export const emptyProgress = (): Progress => ({ v: 2, lessons: {} });

const isRecord = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

/** Stored progress, upgraded to the current version; anything unreadable is empty progress. */
export function parseProgress(raw: string | null): Progress {
  let parsed: unknown;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    return emptyProgress();
  }
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

/** Every variant of the set answered right. */
export function setSolved(e: LessonProgress | undefined, id: string, variants: number): boolean {
  const done = e?.solved[id] ?? [];
  return Array.from({ length: variants }, (_, i) => i).every((i) => done.includes(i));
}

/** Read to the end with every set solved; `sets` gives each exercise id's variant count. */
export function lessonCompleted(e: LessonProgress | undefined, sets: Record<string, number>): boolean {
  return !!e?.read && Object.entries(sets).every(([id, n]) => setSolved(e, id, n));
}
