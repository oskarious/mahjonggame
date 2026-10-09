## 1. Compact tile face (Tile.svelte)

- [x] 1.1 Add a `compact?: boolean` prop to `Tile` and put a `compact` class on the root `.tile` element
- [x] 1.2 Under `.compact`, add a `@container (max-width: 31.9px)` block that centres the `.index` (larger font ≈ 0.62·w, keeps suit colours and red-five style) and fades the `img` (opacity ≈ 0.35); keep the 16 px hide rule and `body.no-tile-labels` from applying to the compact face
- [x] 1.3 Check the compact face with dora (gold), focus (blue), dim, hint dot and selected states; nothing above 32 px changes

## 2. Strip sizing by tile count (PlayerArea.svelte)

- [x] 2.1 Pass `style:--n={concealed.length}` on `.hand` and change `--tw` to `min(calc((100cqw - 10px) / var(--n)), 52px)`
- [x] 2.2 Render strip tiles with `compact`; remove the `.gap` and the drawn-tile slot from the strip

## 3. Drawn tile in the action row (PlayerArea.svelte)

- [x] 3.1 Render the drawn tile in the panel middle slot (revised: centred in a `--panel-2` slot; round info, dora and wall moved into the panel from the Board round bar)
- [x] 3.2 Extend `press` with `from: 'hand' | 'drawn'`; add pointer handlers on the drawn slot that set `press` for the drawn tile and capture the pointer
- [x] 3.3 In `pointerMove`, only re-hit-test via `tileAt` when `from === 'hand'`; `pointerUp` calls `tap(tile, flick)` for both sources
- [x] 3.4 Show the magnifier only for strip presses / a selected tile that is in the strip; show the armed flick on the drawn tile itself (raise + accent outline)
- [x] 3.5 Make `keyTap` work for the drawn tile (skip the `selectedX` lookup when the tile is not in the strip)
- [x] 3.6 Confirm hints preview, board focus highlight, riichi mode and quick discard work from the drawn slot

## 4. Verification and docs

- [x] 4.1 `npm run typecheck` passes
- [x] 4.2 Browser check at 360 px and 390 px (mobile preset) and desktop: compact vs artwork faces, 13-tile vs 10-tile sizes, drawn tile position, tap/flick/keyboard on the drawn tile, no size change between on- and off-turn
- [x] 4.3 Rename the DevPanel label toggle text to "Corner labels" and update the UI conventions section in `AGENTS.md` (compact face, drawn tile in the action row, count-based sizing)
