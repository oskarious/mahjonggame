// Course progress on this device only (no account): lessons read to the end and exercise variants solved, by slug and
// id. Loaded on mount, so server-rendered HTML never depends on it; storage errors are ignored.
import { emptyProgress, lessonCompleted, parseProgress } from './progress-data';

const KEY = 'riichi:learn';

const state = $state({ data: emptyProgress() });

export function loadProgress(): void {
  try {
    state.data = parseProgress(localStorage.getItem(KEY));
  } catch {
    /* unavailable: start empty */
  }
}

function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state.data));
  } catch {
    /* storage unavailable */
  }
}

// Assign, then read back through the state: `??=` returns the plain object, and changes to it would bypass the proxy.
function entry(slug: string) {
  state.data.lessons[slug] ??= { solved: {} };
  return state.data.lessons[slug];
}

export function markSolved(slug: string, id: string, variant: number): void {
  const e = entry(slug);
  e.solved[id] ??= [];
  if (!e.solved[id].includes(variant)) e.solved[id].push(variant);
  save();
}

export function markRead(slug: string): void {
  entry(slug).read = true;
  save();
}

/** The variants of an exercise set answered right (indexes). */
export function solvedVariants(slug: string, id: string): number[] {
  return state.data.lessons[slug]?.solved[id] ?? [];
}

/** Read to the end with every exercise set solved; `sets` gives each id's variant count. */
export function completed(slug: string, sets: Record<string, number>): boolean {
  return lessonCompleted(state.data.lessons[slug], sets);
}
