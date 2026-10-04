// Course progress on this device only (no account): lessons read to the end and exercises solved, by slug and id.
// Loaded on mount, so server-rendered HTML never depends on it; storage errors are ignored.

const KEY = 'riichi:learn';

interface Stored {
  v: 1;
  lessons: Record<string, { read?: true; solved: string[] }>;
}

const state: { data: Stored } = $state({ data: { v: 1, lessons: {} } });

export function loadProgress(): void {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Stored) : null;
    if (parsed?.v === 1 && parsed.lessons && typeof parsed.lessons === 'object') state.data = parsed;
  } catch {
    /* unavailable or unreadable: start empty */
  }
}

function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state.data));
  } catch {
    /* storage unavailable */
  }
}

function entry(slug: string) {
  return (state.data.lessons[slug] ??= { solved: [] });
}

export function markSolved(slug: string, id: string): void {
  const e = entry(slug);
  if (!e.solved.includes(id)) e.solved.push(id);
  save();
}

export function markRead(slug: string): void {
  entry(slug).read = true;
  save();
}

export function solved(slug: string, id: string): boolean {
  return !!state.data.lessons[slug]?.solved.includes(id);
}

/** Read to the end with every exercise solved. */
export function completed(slug: string, exerciseIds: readonly string[]): boolean {
  const e = state.data.lessons[slug];
  return !!e?.read && exerciseIds.every((id) => e.solved.includes(id));
}
