## Why

Offline games against bots are lost as soon as the tab closes, the page reloads or the phone kills the browser in the
background — which on mobile happens all the time. A game is fully reproducible from `(rules, seed, actions[])`, and
`LocalGame` already keeps that log, so saving and resuming is cheap.

## What Changes

- Offline games are saved to `localStorage` after every applied action (the player's and the bots'): format version,
  rules, seed, human seat, local settings and the action log.
- Opening `/play` without parameters resumes the saved game by replaying its log; with no save it starts a new game
  with default settings.
- Opening `/play` with parameters (the home page's new-game form, `?seed=` links) starts a new game and replaces the
  save; the URL is then cleaned to `/play` so a reload resumes instead of starting over.
- The home page shows **Continue** (with the saved game's round) next to **New game** when a save exists.
- The save is removed when the game ends (`gameOver`), and discarded when it cannot be read or replayed (e.g. after an
  engine change), falling back to a new game.
- Storage failures (private mode, blocked storage, quota) never break play; the game just isn't saved.
- Out of scope: share/restore links with the game encoded in the URL (possible follow-up), multiple save slots,
  online games (the server already persists those).

## Capabilities

### New Capabilities
- `local-game-resume`: saving offline bot games in the browser and resuming them from `/play` and the home page.

### Modified Capabilities
<!-- none: there are no existing specs -->

## Impact

- `apps/web/src/lib/game/local.svelte.ts`: restore from a log, save hook after each applied action, clear on game over.
- New `apps/web/src/lib/game/saved.ts`: storage key, versioned payload, load/save/clear (all guarded).
- `apps/web/src/routes/play/+page.svelte`: resume vs. new decision, URL cleanup.
- `apps/web/src/routes/+page.svelte`: Continue / New game buttons (client-side only; the page is server-rendered).
- No engine, protocol, game-server or database changes.
