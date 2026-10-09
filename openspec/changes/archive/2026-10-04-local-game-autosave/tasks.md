## 1. Save storage

- [x] 1.1 Add `apps/web/src/lib/game/saved.ts`: `SAVE_VERSION`, `SavedGame` type `{ v, rules, seed, human, settings, actions, round: { wind, dealer } }`, and `loadSave()` / `writeSave()` / `clearSave()` with every storage and parse error caught (`loadSave` returns `null` for missing, invalid or other-version data)

## 2. LocalGame

- [x] 2.1 Add an `autosave` option to `LocalGame`. After each successful `#apply`, write the save (or clear it when `phase === 'gameOver'`)
- [x] 2.2 Add static `LocalGame.restore(saved, { autosave })`: create from rules and seed, replay `actions` with `applyAction` (no bot scheduling during replay), fill `log`, apply saved settings, then schedule. Throw on any replay error
- [x] 2.3 Write the save once when a new autosaving game is created, so a game with no moves yet also resumes

## 3. /play

- [x] 3.1 Without query parameters: `loadSave()` → `restore`. On a throw, `clearSave()` and fall back to a new default game. Without a save, start a new default game
- [x] 3.2 With query parameters: start a new game (overwrites the save), then `replaceState` to `/play` (SvelteKit `replaceState` from `$app/navigation`)
- [x] 3.3 Check that the in-game restart (settings sheet and game over) overwrites the save and keeps the current settings

## 4. Home page

- [x] 4.1 Read the save in `onMount`. With a save, show a Continue button linking to `/play` in one row with New game (primary only without Play online), labelled with the round (e.g. "East 3" from `round`), and label the form's submit "New game"
- [x] 4.2 Keep the layout stable before mount (no Continue, no hydration mismatch), using existing button styles

## 5. Verify

- [x] 5.1 Run `npm run typecheck`
- [x] 5.2 In the browser on localhost: play a few turns, reload `/play` → same position. Start New game from home → new game, URL `/play`, reload resumes it. Continue shows the right round
- [x] 5.3 In the browser: corrupt the save (and set an unknown `v`) → `/play` starts a new game without errors. Finish a game (autoplay) → save cleared, no Continue on home
- [x] 5.4 In the browser: make `localStorage` throw → play still works
- [x] 5.5 Update AGENTS.md (layout entry for `saved.ts`, and a note to bump `SAVE_VERSION` on replay-affecting engine changes)
