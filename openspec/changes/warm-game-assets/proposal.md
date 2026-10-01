## Why

During play, tile artwork sometimes pops in late (a tile kind seen for the first time shows an empty face for a
moment), and sounds stay silent until the player taps inside the game. Both come from loading assets lazily at the
moment they are first needed: tile `<img>`s fetch on first render, and the audio player only starts listening for the
unlocking gesture once the game table mounts — so the tap that started the game (Play / Quick play) never counts.

## What Changes

- Arm the sound player at app start (root layout) instead of when `Table` first calls `sound()`, so any earlier tap on
  the site (home, lobby, Quick play, bot setup) unlocks Web Audio and prefetches every cue file before the game starts.
- Warm the active tileset's artwork ahead of play: preload and decode every tile image of the chosen tileset from app
  start (root layout, idle time) and again whenever the tileset changes; keep the decoded images referenced so the browser does not evict them.
- Serve tile artwork with long-lived, content-hashed URLs: move both tilesets from `static/tiles/` into
  `src/lib/assets/tiles/` and resolve them through Vite imports, so repeat visits hit the HTTP cache instead of
  revalidating ~40 files per tileset (adapter-node serves `static/` without `max-age`).
- Not changed: a full page load straight into a running game (reload, reconnect) still needs one tap before audio can
  play — the browser autoplay policy allows nothing else.

## Capabilities

### New Capabilities

- `game-asset-warmup`: when and how tile artwork and sound files are loaded and unlocked so they are ready the
  moment a game needs them.

### Modified Capabilities

(none — no existing specs)

## Impact

- `apps/web/src/lib/audio/player.ts` (arming split from `sound()` construction), `apps/web/src/routes/+layout.svelte`.
- `apps/web/src/lib/tiles.ts` (image URLs from Vite imports), new tile preloader module.
- Files move: `apps/web/static/tiles/**` → `apps/web/src/lib/assets/tiles/**`; `apps/web/scripts/slim-tiles.mjs`
  output path; `tiles/LICENSE.md` moves along.
- Docs: `docs/agents/web.md` (asset locations), `docs/agents/ui.md` (Sounds: unlock on any first gesture; tile warmup).
- No protocol, server, or fairness impact: only public, static assets are loaded; nothing depends on game state.
