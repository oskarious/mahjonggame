## Context

Learn progress (`lib/learn/progress.svelte.ts`, data shape and parsing in `progress-data.ts`, key `riichi:learn` v2)
and trainer stats (`lib/train/stats.svelte.ts`, key `riichi:train` v1) are runes stores backed by localStorage. Every
visitor gets the same treatment, and accounts play no part. Both stores are loaded on mount (`loadProgress`,
`loadStats`), so server-rendered HTML never depends on them, and storage errors are swallowed. Users of the stores:
`Exercise.svelte`, `LessonBody.svelte`, `routes/learn/+page.svelte`, `Trainer.svelte`, `routes/train/+page.svelte`
and `routes/train/daily/+page.svelte`.

Accounts are Better Auth on Postgres. `hooks.server.ts` puts `locals.user` on every request, and the root layout
exposes `{ id, name }` as `page.data.user`. Sign-up and login finish with a client-side
`goto(next, { invalidateAll: true })`, so module state in the browser survives the switch from guest to user. Web
owns the schema through Kysely migrations in `apps/web/migrations/` and types in `lib/server/schema.ts`.

The goal is a sign-up incentive: progress is something you keep only with an account.

## Goals / Non-Goals

**Goals:**
- No progress in browser storage for anyone. Signed-in players keep it on their account, on every device.
- Guests keep full functionality for the visit, and can claim that visit's progress by signing up or signing in.
- Existing device progress is not silently lost: it is imported once.
- Server-rendered HTML stays progress-free (SEO and caching unchanged).
- The client and server use one set of rules (reducers) for applying changes.

**Non-Goals:**
- The offline game autosave (`riichi:game`). It resumes an interrupted game and is not progression. Dropping it would
  punish a phone that reloads a tab, not motivate a sign-up.
- The daily discard poll. A guest's vote stays keyed by the `riichi_voter` cookie, and it is a poll, not progress.
- Leaderboards, achievements or public profiles built on progress (see roadmap.md). The stored data is self-reported
  and only for the player's own view.
- Settings in localStorage (audio, tileset, table toggles, online-page toggles).

## Decisions

### One `user_progress` row per user with two JSONB documents
Columns: `userId uuid` (PK, references `user.id` on delete cascade), `learn jsonb` (the `Progress` v2 shape), `train
jsonb` (the `Stored` v1 shape) and `updatedAt`. The documents are small (tens of lessons, four trainers, a few hundred
daily entries over a year). They are always read whole, and they already have tested shapes.
*Alternatives:* normalized tables (`lesson_progress`, `trainer_stats`, `daily_result`) would let the database do the
merging. But they triple the schema and the reducers for no query we need. Rows in the `user` table would mix
progress into the auth table that Better Auth manages.

### Pure reducers shared by client and server
Keep `lib/learn/progress-data.ts` rune-free and add `lib/train/stats-data.ts` the same way. Each holds the shape, a
parser (with the v1 upgrade for learn), one `apply(doc, event)` per event kind and a `merge(a, b)` for claiming and
importing. The runes stores call `apply` locally for instant UI. `POST /api/progress` calls the same `apply` on the
stored document. Unit tests cover the reducers, the merge rules and the validation.

### Events, not whole-document writes
The client sends events in order: `{ kind: 'read', slug }`, `{ kind: 'solved', slug, id, variant }`,
`{ kind: 'answer', trainer, firstTry }`, `{ kind: 'rush', trainer, score }` and `{ kind: 'daily', date, right }`.
The server applies them inside a transaction on the user's row, locked with `SELECT … FOR UPDATE` (the row is
created with `ON CONFLICT DO NOTHING` first). That way two tabs never overwrite each other's counters.
*Alternative:* PUT the whole document. It is simpler, but the last write wins across tabs and devices, and the
client could write any state at all.

Validation (the request is rejected with 400, all or nothing):
- `slug` must be in the lesson registry, `id` an exercise set of that lesson, and `variant` below its variant count.
- `trainer` must be in the trainer registry.
- `date` must be today's or yesterday's UTC date (a set open across midnight).
- At most 100 events per request.

A daily answer beyond the set's size is ignored, not rejected, so a retried batch can't fail forever. No session
means 401.

### A merge operation for claiming and importing
`POST /api/progress` also takes `{ merge: { learn?, train? } }`. It is used once when a guest becomes a user (the
visit's documents) and once for imported device data. The server parses the documents with the same parsers and
drops entries that no longer exist (removed lessons or exercises) instead of rejecting them. Then it merges them:
- read flags and solved variants: union
- `bestStreak` and `rushBest`: max
- `answered` and `firstTry`: sum
- current `streak`: the account's value (the visit's for a trainer the account never answered)
- daily: keep the account's results for a date it has, else take the incoming ones (capped at the set size, dates up
  to today)

Adding the counts can double-count if the same visit is merged twice. The client sends the visit snapshot once, on
the user-id change, and then clears it.

### The store's life cycle follows the user id
Both stores keep `owner: string | null | undefined` (undefined means not loaded yet). On mount, each page calls
`load(page.data.user?.id ?? null)`:
- **Guest, first load in the visit:** read the legacy keys (try/catch). Parse them into memory, remove the keys,
  then set `owner = null`. No storage writes afterwards.
- **User, first load:** fetch `GET /api/progress`. If legacy keys exist, send them as a merge first, then remove
  them. Keep the result in memory.
- **Guest → user** (owner was `null`, now an id, after sign-up or login without a reload): send the visit's
  documents as a merge (when they are not empty), then load as a user. This is claiming.
- **User → guest** (sign-out): clear memory to empty, so the next guest on a shared device starts fresh.
- **User → another user:** replace the memory with the new user's load.

A single shared progress client (`lib/progress/client.svelte.ts`) owns the fetch, the merge and an outbox. The
learn and train stores sit on top of it, so there is one GET for both documents, one queue and one owner switch.
The outbox is in memory. On a failed POST the events stay queued and go out in front of the next event's POST. A
`pagehide` flush uses `fetch(…, { keepalive: true })`.

*Alternatives:* load progress in `+layout.server.ts`. That adds a DB query to every page, puts progress in the
server-rendered HTML, and breaks the rule that HTML never depends on progress. Or keep guest progress in
sessionStorage so it survives a reload. That softens the incentive, and "nothing in browser storage" is a simpler
rule to state and test.

### `statsLoaded` and "nothing shown until loaded"
The existing `statsLoaded()` gate (and the matching learn behaviour) now means "the owner's progress is in memory".
For guests that happens right away. For users it happens after the GET. If the GET fails, the gate opens with empty
documents and events still queue. If the next POST succeeds, those events are applied on the server, so nothing is
lost, only not shown.

### The guest nudge
`lib/progress/ProgressNudge.svelte` is a quiet row: "Not saved" in the design system's `label` style and one ghost
button, "Sign up to keep it", that goes to `/signup?next=<current path and query>`. The design system has no
notice component and no icons (glyphs only where they are the control), so it follows the inline CTA row. It renders
only when `page.data.user` is null **and** the visit has some progress (an untouched first visit sees only the
existing CTA). It goes under the title of `/learn` and `/train`, above the CTA at the end of a lesson, and in the
Rush and daily results.

### API route
`routes/api/progress/+server.ts` handles GET (empty documents when the user has no row) and POST (events or merge).
It answers `Cache-Control: no-store`. `/api/` should already be disallowed in robots.txt; add it if not. Bot players
never call it, and nothing counts users from this table, so the "join `bot`" rule doesn't apply.

## Risks / Trade-offs

- [Guests lose progress on a reload. A mobile browser can evict a background tab mid-lesson.] → This is intended
  friction, but it should not feel like a bug. The nudge appears as soon as there is progress, so the loss is
  expected.
- [Current device users who don't sign up lose their stored progress after one visit.] → It is imported into that
  visit and kept if they sign up then. The site is young and the loss is small. The alternative, keeping legacy data
  readable forever, would contradict the rule.
- [A failed POST loses events if the tab closes before the next try.] → The `pagehide` keepalive flush helps. The
  remaining loss is a few answers of self-reported stats.
- [Self-reported stats can be forged by a crafted client.] → They are only shown to the player. Validation keeps
  documents well-formed and bounded. Don't build rankings on them (non-goal).
- [Spec deltas modify requirements in `learn-section`, `exercise-sets` and `trainers`, which exist only in unarchived
  changes (`openspec/specs/` is empty).] → Archive `interactive-lessons`, `exercise-sets` and `trainers` before this
  change, so the MODIFIED and REMOVED headers resolve.
- [Two GETs racing on fast navigation.] → The shared client keeps one in-flight promise per owner.

## Migration Plan

1. Add migration `0007_user_progress.ts` (create the table, drop it on `down`) and the `UserProgressTable` type.
   Migrations run on web start, as they do now.
2. Deploy the web app. The first visit of each browser imports and removes the legacy keys. No backfill is possible
   or needed server-side.
3. Rollback: redeploy the previous web image. The legacy keys are already gone, so rolled-back clients start empty.
   That is acceptable, and the table can stay until a forward fix.

## Open Questions

- Should the existing end-of-lesson CTA copy for guests mention keeping progress, instead of adding a separate
  nudge row? It would be fewer elements, but the CTA's job is "play".
