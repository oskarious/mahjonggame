## Context

`LocalGame` (`apps/web/src/lib/game/local.svelte.ts`) runs offline games in the browser: `createGame(rules, seed)`,
then every action goes through `#apply`, which runs `applyAction` and pushes the action onto `log`. The bots use
`Math.random`, but their chosen actions end up in the log, so replaying the log gives the exact same game no matter
how the bots were seeded. `/play` builds a new game from query parameters on every load (`preset`, `length`, `bots`,
`hints`, `seed`), and the human seat is random. The home page (`routes/+page.svelte`) is server-rendered and sends
the form to `/play?…`. Other code already uses guarded `localStorage` for small preferences (Table, online page).

## Goals / Non-Goals

**Goals:**
- A reload, closed tab or killed browser does not lose an offline game.
- `/play` resumes automatically. The home page offers Continue and New game.
- Degrade silently when storage is missing or the save is stale.

**Non-Goals:**
- Game state in the URL / share links (follow-up; the format below is a starting point).
- Multiple save slots, a history of finished games, syncing saves to the account.
- Anti-cheat: offline play is client-side anyway (`?seed=` already reveals the wall).

## Decisions

**Store the inputs, not the state.** The payload is
`{ v: 1, rules, seed, human, settings, actions, round: { wind, dealer } }` under one key (`riichi.localGame`).
`GameState` holds the whole wall and is larger. It is also an internal engine shape that changes freely, while
`Action` is the stable, public input format. A replay of ~500 actions (`structuredClone` per step) takes well under
100 ms. Alternative: serialize `GameState`. It is instant to restore but brittle across engine changes and holds
redundant data.

**`round` is a denormalized summary** so the home page can label Continue ("East 3") without importing the engine or
replaying. It is written on every save from the current state.

**Save in `#apply`, synchronously, after each successful action.** At a few hundred actions the JSON is at most tens
of KB, so writing on every step is cheap and nothing is lost if the tab dies. Alternative: save on `pagehide` or
`visibilitychange`. That is unreliable on mobile when the OS kills the tab, so it's rejected. A debounce isn't needed.

**`LocalGame` gets a static `restore(saved)`** that builds the game and replays with `applyAction` directly, without
scheduling bots between steps. It throws on any failure, and the caller treats that as "discard the save". Saving
lives in a small `saved.ts` module (`loadSave`, `writeSave`, `clearSave`, `SAVE_VERSION`). Each function catches
storage and parse errors: `loadSave` returns `null` for missing, unparsable or other-version data, and the others
swallow errors. `LocalGame` takes an `autosave` flag (on for `/play`) so tests or other uses don't touch storage.

**Validation is shallow.** Check `v`, the field types, and that `actions` is an array. Replay is the real validation,
because the engine rejects illegal actions. A log that replays legally but differently after an engine change (e.g.
a changed wall RNG) can't be detected cheaply. Bump `SAVE_VERSION` when an engine change affects replays (wall
generation, action shapes, rule defaults stored inside `RuleSet`).

**Game over clears the save.** When `state.phase` becomes `gameOver`, `clearSave()` runs instead of a write. The
final results stay on screen, but a reload afterwards starts a new game. Alternative: keep it until the next game
starts. That would make Continue show a finished game, which isn't useful.

**Parameters mean "new game".** `/play` without query parameters resumes, or starts a default game when there is no
save. Any parameter starts a new game (and overwrites the save). The page then calls `replaceState` to `/play`, so a
reload resumes that game rather than rolling a new one. The in-game "New game" (settings sheet and game-over
"again") also overwrites the save, keeping the current settings as it does today. Settings changed mid-game (hints,
bot Elo, debug toggles) are saved too, on the next action, so a resumed game keeps them.

**Home page reads the save on mount** (`onMount`, client only) to avoid an SSR/hydration mismatch. Until then only
New game is shown. With a save, Continue (a link to `/play`, showing the round) sits in one row next to the form's
submit, which becomes "New game". Continue is primary only when Play online is not shown, so it never looks like
the online button. No confirmation dialog when New game overwrites a save (minimal UI). Revisit if it bites.

## Risks / Trade-offs

- [An engine change makes old saves replay into a different game without an error] → Bump `SAVE_VERSION` for
  replay-affecting engine changes. The worst case is a strange-looking offline game that the player can abandon.
- [New game silently discards an unfinished game] → Continue is the primary, visible option on the home page.
  Add a confirm later if players complain.
- [Two tabs playing offline overwrite each other's save] → The last write wins. Acceptable for a single-slot save.
- [Storage quota or blocked storage] → Guarded writes. Play continues unsaved.
