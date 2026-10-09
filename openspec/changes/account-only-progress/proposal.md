## Why

Today every visitor's Learn progress and trainer stats are kept in localStorage. Nobody needs an account to keep
them, and they stay on one device. If only signed-in players keep their progress, there is a real reason to sign up
right when a reader is invested (a few lessons done, a streak going). That makes the free course and trainers lead to
sign-ups, which is why they exist. It also gives signed-in players progress on every device they use.

## What Changes

- **BREAKING (guests):** Learn progress (read lessons, solved variants) and trainer stats (per-trainer stats, Rush
  bests, daily results and streak) are no longer written to localStorage. A guest's progress lives only in memory for
  the visit: it holds across client-side navigation and is lost on reload or when the tab closes.
- Signed-in players' progress is stored on their account in Postgres and loaded on mount on any device. Each change
  is sent to the server as a small event, and the server applies it with the same reducers the client uses.
- Signing up or signing in claims the progress the guest made during that visit: it is merged into the account.
- Existing device progress (`riichi:learn`, `riichi:train`) is imported once: into the account when signed in, or
  into the visit's memory for a guest (so a sign-up in that visit keeps it). Then the keys are removed.
- Guests get one small, visual nudge where their progress shows (the `/learn` index, the `/train` hub, the end of a
  lesson, a finished Rush or daily set). It links to sign up and back to the page, so they keep what they did.
- Server-rendered HTML still never depends on progress. Progress is read on mount only.

## Capabilities

### New Capabilities
- `account-progress`: progress stored on the account: the storage, the load and record API, event validation, the
  guest visit store, claiming at sign-up and sign-in, the one-time import of device progress, and the guest nudge.

### Modified Capabilities
- `learn-section`: "Progress on this device" becomes progress on the account (guests: this visit only). The course
  index shows completion from that progress.
- `exercise-sets`: set solved state and progress no longer refer to device storage. The old-format upgrade still
  applies to imported device progress.
- `trainers`: "Per-device stats", the hub's stats, Rush bests and the daily streak come from the account (guests:
  this visit only).

## Impact

- **DB:** a new migration with a `user_progress` table (one row per user: learn and train JSON, cascade on user
  delete) and its type in `apps/web/src/lib/server/schema.ts`. It is not a game-server table, so
  `apps/game-server/src/db.ts` is unchanged.
- **Web:** new `routes/api/progress/+server.ts` (GET, POST). `lib/learn/progress.svelte.ts` and
  `lib/train/stats.svelte.ts` are rewritten as account- or memory-backed stores. Rune-free reducers move to
  `progress-data.ts` and a new `train/stats-data.ts`, shared with the server. Sign-up and login claim guest progress.
  A guest nudge goes on the learn index, train hub, lesson end, Rush end and daily result.
- **Docs:** `docs/agents/web.md` (Learn progress, trainer stats) and `docs/agents/ui.md` (where the nudge shows).
- **Not affected:** the offline game autosave (`riichi:game`), the daily discard poll (guest votes by cookie), audio,
  tileset and table settings in localStorage. None of these is progress.
