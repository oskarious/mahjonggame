## 1. Shared reducers

- [x] 1.1 Extend `apps/web/src/lib/learn/progress-data.ts` with event types and `applyLearn(doc, event)` (read,
      solved) and `mergeLearn(a, b)` (unions), keeping `parseProgress` and the v1 upgrade
- [x] 1.2 Add rune-free `apps/web/src/lib/train/stats-data.ts`: the `Stored` shape, `parseStats`, `applyTrain` (answer,
      rush, daily with set-size cap), `mergeTrain` (sum counts, max bests, account's streak, daily per missing
      date), and move `dailyStreak` logic here
- [x] 1.3 Add validators: events against the lesson registry (slug, exercise id, variant count) and trainer registry,
      daily date today/yesterday UTC; snapshot cleaners that drop unknown entries for merges
- [x] 1.4 Unit tests for apply, merge and validation (including double-tab ordering and the v1 import); then do a
      mutation check by planting bugs

## 2. Database and API

- [x] 2.1 Migration `apps/web/migrations/0007_user_progress.ts`: `user_progress(userId uuid PK → user.id cascade,
      learn jsonb, train jsonb, updatedAt)`; add `UserProgressTable` to `lib/server/schema.ts`
- [x] 2.2 `lib/server/progress.ts`: `getProgress(userId)`, `applyEvents(userId, events)` and
      `mergeProgress(userId, snapshot)` in a transaction with the row created then locked `FOR UPDATE`
- [x] 2.3 `routes/api/progress/+server.ts`: GET (empty docs when no row), POST `{ events }` (≤100, all-or-nothing
      400) or `{ merge }`; 401 without a session; `Cache-Control: no-store`
- [x] 2.4 Make sure robots.txt disallows `/api/`
- [x] 2.5 Tests for the endpoint's logic (400 on unknown exercise, events applied in order, merge drops unknown
      entries) via `parseRequest`/`applyEvent` (web has no DB test harness); 401 and the round trip checked in the browser

## 3. Client stores

- [x] 3.1 `lib/progress/client.svelte.ts`: owner tracking (`undefined | null | id`), one in-flight GET per owner,
      in-memory outbox with retry on the next send and `pagehide` keepalive flush, owner switches (guest→user claim
      merge, user→guest clear, user→user reload)
- [x] 3.2 Legacy import in the client: read and remove `riichi:learn` / `riichi:train` once (try/catch). Guests load
      them into memory, users send them as a merge
- [x] 3.3 Rewrite `lib/learn/progress.svelte.ts` on the client: no localStorage; `markRead`/`markSolved` apply
      locally and queue an event; `loadProgress(userId)` replaces the old load
- [x] 3.4 Rewrite `lib/train/stats.svelte.ts` the same way: `recordAnswer`/`recordRush`/`recordDaily` queue events,
      and `statsLoaded` means the owner's progress is in memory
- [x] 3.5 Update the callers (`LessonBody`, `Exercise`, `routes/learn/+page.svelte`, `Trainer`,
      `routes/train/+page.svelte`, `routes/train/daily/+page.svelte`) to pass `page.data.user?.id ?? null` and react
      to its change
- [x] 3.6 Confirm sign-up and login (`goto(..., { invalidateAll: true })`) trigger the claim without a reload, and
      sign-out clears memory

## 4. Guest nudge

- [x] 4.1 Check the design system README for an inline notice or link-row pattern and an icon for "not saved"
- [x] 4.2 Build `ProgressNudge.svelte` (guest with progress only; link to `/signup?next=<current path>`; minimal text)
- [x] 4.3 Place it on the `/learn` index, the `/train` hub, at the end of a lesson, and in the Rush and daily results

## 5. Cleanup and docs

- [x] 5.1 Grep for `riichi:learn`, `riichi:train`, "per device" and "on this device" (code, copy, tests, docs), and
      remove or reword what is now wrong or dead
- [x] 5.2 Update `docs/agents/web.md` (Learn progress, Train stats, the new API route and table) and
      `docs/agents/ui.md` (where the nudge shows)
- [x] 5.3 Run `npm test` and `npm run typecheck`

## 6. Browser check

- [x] 6.1 On localhost (launch configs web-5175 + game): as a guest, solve sets and train. Check that nothing is
      written to localStorage, progress shows across client navigation and is gone after a reload, and the nudge
      appears
- [x] 6.2 Sign up from the nudge mid-visit and check the progress is kept. Then on a fresh browser profile signed in
      as the same user, check it shows. Sign out and check memory is cleared
- [x] 6.3 Seed legacy `riichi:learn`/`riichi:train` keys and check the import for both a guest and a user. Then stop
      the dev servers
