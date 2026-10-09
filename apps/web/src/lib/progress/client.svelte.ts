// The reader's progress in memory, for whoever is signed in. A signed-in player's comes from the account (fetched once
// per visit) and every change is sent as an event; a guest's lives only in memory, for this visit, and is claimed
// (merged into the account) on sign-up or sign-in. Nothing is written to browser storage. Pages that show or record
// progress call `trackOwner`; server-rendered HTML never depends on progress.
import { page } from '$app/state';
import { parseProgress } from '../learn/progress-data';
import { parseStats } from '../train/stats-data';
import { type Docs, MAX_EVENTS, type ProgressEvent, applyEvent, emptyDocs, isEmptyDocs, mergeDocs } from './events';

const API = '/api/progress';
/** Device progress stored by earlier versions: imported once, then removed. */
const LEGACY = { learn: 'riichi:learn', train: 'riichi:train' } as const;

const state: Docs & { loaded: boolean } = $state({ ...emptyDocs(), loaded: false });

/** Whose progress is in memory: undefined before the first sync, null for a guest. */
let owner: string | null | undefined;
/** A signed-in player's events not yet stored. */
let outbox: ProgressEvent[] = [];
/** A claimed visit or imported device progress not yet stored. */
let pendingMerge: Docs | null = null;
let sending = false;

/** The progress shown: the course and the trainers. */
export const docs = (): Docs => state;

/** Whether the owner's progress is in memory (until then, nothing shows as done and no stats are shown). */
export const progressLoaded = () => state.loaded;

/** Whether this visit has any progress (for the guest nudge). */
export const hasProgress = () => !isEmptyDocs(state);

/** Reads and removes device progress stored by earlier versions; null when there is none. */
function takeLegacy(): Docs | null {
  try {
    const learn = localStorage.getItem(LEGACY.learn);
    const train = localStorage.getItem(LEGACY.train);
    if (learn === null && train === null) return null;
    localStorage.removeItem(LEGACY.learn);
    localStorage.removeItem(LEGACY.train);
    const d = { learn: parseProgress(learn), train: parseStats(train) };
    return isEmptyDocs(d) ? null : d;
  } catch {
    return null; /* storage unavailable */
  }
}

function show(d: Docs, loaded: boolean) {
  state.learn = d.learn;
  state.train = d.train;
  state.loaded = loaded;
}

/** Keeps the progress in memory the signed-in user's (or the guest's), from mount on. Call during component init. */
export function trackOwner(): void {
  $effect(() => syncOwner((page.data.user as { id: string } | null | undefined)?.id ?? null));
}

/** Makes `id` (a user id, or null for a guest) the owner of the progress in memory. */
function syncOwner(id: string | null): void {
  if (id === owner) return;
  const prev = owner;
  owner = id;
  outbox = [];
  pendingMerge = null;
  if (id === null) {
    // A guest: device progress from earlier versions on the first visit; empty after a sign-out.
    show((prev === undefined && takeLegacy()) || emptyDocs(), true);
    return;
  }
  // A guest who signed up or in claims the visit; the first load imports device progress.
  const claim = prev === null ? $state.snapshot(state) : prev === undefined ? takeLegacy() : null;
  if (claim && !isEmptyDocs(claim)) pendingMerge = { learn: claim.learn, train: claim.train };
  show(emptyDocs(), false);
  void load(id);
}

async function load(id: string): Promise<void> {
  await flush();
  let loaded = emptyDocs();
  try {
    const res = await fetch(API);
    if (res.ok) loaded = await res.json();
  } catch {
    /* offline: show none, keep recording */
  }
  if (owner !== id) return;
  // What the server doesn't have yet: a claim that didn't go through, changes made while loading.
  if (pendingMerge) mergeDocs(loaded, pendingMerge);
  for (const e of outbox) applyEvent(loaded, e);
  show(loaded, true);
  void flush();
}

/** Applies a change now and, for a signed-in player, stores it on the account. */
export function record(e: ProgressEvent): void {
  applyEvent(state, e);
  if (!owner) return;
  outbox.push(e);
  if (state.loaded) void flush();
}

/** 'ok', 'drop' (refused: retrying can't help) or 'retry' (offline or a server error). */
async function post(body: unknown, keepalive = false): Promise<'ok' | 'drop' | 'retry'> {
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive,
    });
    return res.ok ? 'ok' : res.status < 500 ? 'drop' : 'retry';
  } catch {
    return 'retry';
  }
}

/** Sends what is pending, in order; whatever fails to send goes with the next change. */
async function flush(): Promise<void> {
  if (sending) return;
  sending = true;
  try {
    while (owner && (pendingMerge || outbox.length)) {
      const id = owner;
      if (pendingMerge) {
        const m = pendingMerge;
        if ((await post({ merge: m })) === 'retry') return;
        if (pendingMerge === m) pendingMerge = null;
        continue;
      }
      const batch = outbox.slice(0, MAX_EVENTS);
      const r = await post({ events: batch });
      if (r === 'retry' || owner !== id) return;
      outbox = outbox.slice(batch.length);
    }
  } finally {
    sending = false;
  }
}

// Leaving the page: one last try for what is pending (the page may not come back to retry).
if (typeof window !== 'undefined') {
  addEventListener('pagehide', () => {
    if (!owner || sending || !outbox.length) return;
    void post({ events: outbox.slice(0, MAX_EVENTS) }, true);
    outbox = outbox.slice(MAX_EVENTS);
  });
}
