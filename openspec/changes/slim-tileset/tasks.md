## 1. Assets

- [x] 1.1 Write `apps/web/scripts/slim-tiles.mjs` (run with `npx`, not in the build): read the source folder, set every `<text>` to `font-family: 'Malgun Gothic', sans-serif; font-weight: 700` and add `xml:lang="ja"` to the root, drop the white body of `hon/wh.svg`, run svgo, write `apps/web/static/tiles/slim/{man,pin,sou,hon}/*.svg`
- [x] 1.2 Run it; check that the set is < 250 KB and that all 37 tiles render correctly in the browser as `<img>`, both with Malgun Gothic and with the fallback forced (temporary copy with `font-family: sans-serif` only): glyphs centred, readable, not clipped; adjust size/anchoring if they are
- [x] 1.3 Add a README/licence note in `static/tiles/slim/` (artwork by the project author; glyphs use the device's fonts, no font included)

## 2. Tileset model

- [x] 2.1 `lib/tiles.ts`: `TILESETS` (`classic` ratio 4/3 inset `7% 8%`, `slim` ratio 119/60 inset 0) with an `image(kind, red)` per set; `kindImage` / `tileImage` take a tileset (Classic paths unchanged)
- [x] 2.2 `lib/tileset.svelte.ts`: rune store with the active id, read/write `riichi:tileset` in try/catch, unknown or missing → slim (the default); export the current ratio

## 3. Ratio in the layout

- [x] 3.1 `Tile.svelte`: `--h` from `var(--tile-ratio, 4 / 3)`, image from the active tileset, image inset per tileset (CSS var); check sideways tiles, haku frame, index, tint/glow, dim, hint dot, last/win raise on both sets
- [x] 3.2 `Table.svelte`: effect that sets `--tile-ratio` on `<body>` from the store (and removes it on destroy)
- [x] 3.3 `Board.svelte`: `fit()` uses the ratio for `byHeight`; `meldUnits()` counts a sideways tile as (ratio − 1); meld line height uses the ratio
- [x] 3.4 `PlayerArea.svelte`: `.middle` keeps its fixed height; drawn / claimable slot `--tw = 44px × 4/3 ÷ ratio`; magnifier and waits follow `--h` without other changes
- [x] 3.5 Grep `apps/web/src` for any remaining `4 / 3`, `4/3` or tile-height assumptions (ResultSheet, FinalSheet, home page) and fix or confirm them

## 4. Setting

- [x] 4.1 `SettingsSheet.svelte`: "Tiles" select (Classic | Slim, like the hints select) next to the tile labels toggle, wired to the store, in both offline and online games

## 5. Verify

- [x] 5.1 `npm run typecheck` and `npm test` pass
- [x] 5.2 In the browser on localhost at 390 × 844 and 360 × 740: switch Classic ↔ Slim during an offline game; check an 18+ discard pond, a seat with 3–4 melds incl. a kan and a riichi discard, the drawn tile, a call window, the magnifier with waits, the result sheet; the own panel height does not change
- [x] 5.3 Screenshots of both tilesets side by side (same seed, same moment) for the comparison; note the hand strip height cost and whether a cap is needed (design Open Questions)
- [x] 5.4 Update AGENTS.md (layout: `static/tiles/slim`, tileset store; UI conventions: tile ratio comes from the tileset, never hard-coded)
