## 1. Audio armed at app start

- [x] 1.1 In `apps/web/src/lib/audio/player.ts`, split gesture/visibility listener registration out of `sound()` into an idempotent exported `armSound()`; `sound()` only builds and returns the shared player
- [x] 1.2 Call `armSound()` on mount in `apps/web/src/routes/+layout.svelte`
- [x] 1.3 Extend `player.test.ts` if needed: unlock prefetches every non-null cue once; nothing fetched while disabled; enabling after unlock prefetches

## 2. Tile artwork as hashed assets

- [x] 2.1 `git mv apps/web/static/tiles` → `apps/web/src/lib/assets/tiles` (classic files, `slim/`, `LICENSE.md`)
- [x] 2.2 Point `apps/web/scripts/slim-tiles.mjs` at the new output folder; (not re-run: it needs the external source art; only the output path changed)
- [x] 2.3 In `apps/web/src/lib/tiles.ts`, build the URL table with `import.meta.glob(..., { query: '?url', import: 'default', eager: true })` and make both tilesets' `image()` look paths up in it
- [x] 2.4 Add a unit test: every kind (0–33) × red/non-red × tileset resolves to a URL from the table
- [x] 2.5 `npm run build --workspace @mahjong/web`: tile SVGs appear under `_app/immutable/assets/` (or inlined), none under `/tiles/`

## 3. Tile warmup

- [x] 3.1 New `apps/web/src/lib/tile-warmup.ts`: `warmTiles(set)` preloads + `decode()`s every image of a tileset once, keeps the elements in a module map, swallows errors; `idle(fn)` helper with `requestIdleCallback` / `setTimeout` fallback
- [x] 3.2 Add a `$effect` in `+layout.svelte` that warms `tileset()` in idle time (re-runs on tileset change)
- [x] 3.3 Unit test `warmTiles` with a fake image factory: one request per URL, second call a no-op, a failing decode does not throw

## 4. Verify and document

- [x] 4.1 Browser check (launch configs web-5175 + game, localhost): from home, tap Play vs bots → first discard is audible without an in-game tap; Network shows all tile SVGs and cue files loaded before the first discard; no console errors; switching tileset in settings loads the other set. Stop the dev servers afterwards
- [ ] 4.2 Same check via Play online → Quick play (bot opponents) for the online path
- [x] 4.3 Update `docs/agents/web.md` (tiles now in `src/lib/assets/tiles/`, generator output) and `docs/agents/ui.md` (Sounds: armed from the root layout, any first gesture unlocks; tiles: warmed from the layout, hashed URLs)
- [x] 4.4 Dead-code sweep: grep for `static/tiles` and `/tiles/` across the repo (scripts, docs, tests) and remove leftovers
- [x] 4.5 `npm test` and `npm run typecheck` pass; mutation-check the new tests (e.g. drop a red five from the table, make warmup re-request) and confirm they fail
