## Context

`PlayerArea.svelte` renders the own hand as one strip: `.hand` sets `--tw: min((100cqw - 10px) / 14.4, 52px)` and
lays out the sorted concealed tiles, a 0.35-tile gap and the drawn tile. The strip is one pointer target: the nearest
`[data-tile]` slot to the finger is picked, a magnifier floats above it, sliding sideways re-picks until the finger
rises 12 px, and rising 36 px arms a flick discard. `Tile.svelte` draws a face with the artwork inset 7 %/8 % and a
corner index (font `0.34 * w`, hidden below 16 px and when `body.no-tile-labels` is set).

On a 390 px phone this gives 25 px tiles with 21 px of artwork; on 360 px, 23 px. The seat rows above are `flex: 1`,
so the hand is width-bound and has vertical slack.

## Goals / Non-Goals

**Goals:**
- Hand tiles are legible at 23–28 px without a magnifier: the index is the face when tiles are small.
- Tiles use the width that the current hand size allows (open hands get bigger tiles).
- The drawn tile is a large, separate target with the same gestures; the strip is the same size on and off turn.
- Keep the interaction model: one strip, nearest-tile hit, magnifier, flick; portrait, one hand.

**Non-Goals:**
- Pond, meld and opponent tiles keep their current face (compact face is opt-in per `Tile`).
- No new gestures, no landscape, no overlapping or two-row hands, no edge bleed of the strip.
- No change to what the engine or `viewFor` sends.

## Decisions

### D1. Compact face is a `Tile` prop plus a container query, not a separate component

`Tile` gets `compact?: boolean`. The `.face` is already a size container; under `.compact` a
`@container (max-width: 31.9px)` block restyles the existing `.index` span (centred, font about `0.62 * w`, same
suit colours and red-five treatment) and fades the artwork (`opacity` about 0.35) so honours and suit shapes still
hint through. Above 32 px nothing changes, so desktop and tablets keep artwork faces, and the magnifier (56 px) is
unaffected.

- Why a container query and not a JS threshold: the hand width is a CSS value derived from the container; keeping the
  threshold in CSS avoids a ResizeObserver and keeps `Tile` layout-agnostic.
- Why fade rather than hide the artwork: colour alone separates man (red) from sou (green); the faint bamboo vs
  character shapes and the dragon/wind glyphs remain a second cue.
- The `no-tile-labels` setting hides corner labels only. In the compact face the index *is* the face, so the setting
  does not apply there (a compact tile with no label would be unreadable). Documented in the spec.
- Alternative rejected: a separate simplified tile artwork set. More assets, and the index already carries the meaning.
- **Revised after playtesting:** the centred index-as-face was dropped. The `compact` prop now only enlarges the
  corner index (40 % of the width, 48 % below 32 px) over the untouched artwork.
- **Also revised:** the play screen header (back, seat title, cog) is gone. Round info, dora and wall count moved
  from the Board round bar into the own panel, the cog sits at the bottom right under the dora, and leaving the game
  is a button in the settings sheet.

### D2. Strip width divides by the tile count

`.hand` gets `style:--n={concealed.length}` and `--tw: min(calc((100cqw - 10px) / var(--n)), 52px)`. With the drawn
tile out of the strip the count is 13, 10, 7, 4 or 1 and does not change between on-turn and off-turn, so tile size is
stable within a hand and only steps up after a call. The 52 px cap stays.

- Alternative rejected: keep 14.4 as a floor to avoid the size step after a call. The step is the point: after a pon
  the player gets 34 px tiles instead of 25 px.

### D3. Drawn tile lives in the action row, centred

The drawn tile is rendered in `.actions` in the same left, `margin-right: auto` position the claimable tile uses
off-turn (they never coexist: drawn exists only on the player's turn, claimable only in a call window). Its `--tw`
is 44 px (about 59 px tall). The row's `min-height` grows accordingly; the flexible seat rows absorb it.

- Why left: consistent with the claim tile, and the buttons keep their right-aligned position near the thumb.
  Flipping to the right is a one-line CSS change if playtesting prefers it.
- Why not keep it in the strip but larger: two tile sizes on one baseline look broken, and it does not free width.

### D4. Drawn slot reuses the press state machine, without slide or magnifier

The drawn slot is its own pointer target with `pointerdown/move/up/cancel` handlers that share the same `press`
state. `press` gains `from: 'hand' | 'drawn'`:

- `pointerdown` on the drawn slot sets `press = { tile: drawn, from: 'drawn', startY, flick: false }` and captures
  the pointer.
- `pointermove` re-hit-tests with `tileAt` only when `from === 'hand'`; for `'drawn'` it only updates `flick`.
- `pointerup` calls the shared `tap(tile, flick)`; nothing else changes (select, quick discard, riichi mode, hints
  preview and board focus all key off tile id).
- The magnifier is anchored at the section level (x from the section edge, distance above its bottom) so it floats
  above the strip or above the drawn tile, whichever was pressed. Revised after playtesting: the first cut had no
  magnifier for the drawn tile and a hard outline ring, both of which looked wrong; the drawn tile now sits in a
  `--panel-2` slot, the same panel the magnifier uses.
- Touch and pen: the flick is the only discard. A tap inspects while held and does nothing on release (no selection,
  no tap-again, one-tap setting is mouse-only). Revised after playtesting.
- Keyboard: the drawn `Tile` keeps `onclick={keyTap}`; `keyTap` skips the `selectedX` lookup when the tile is not in
  the strip.
- The mouse rules from the `hand-input` spec (hover inspect, click discards, press/release on the same tile) apply
  to the drawn slot as written, treating the slot as a one-tile strip.

## Risks / Trade-offs

- [Compact face looks like a chip, not a tile] → Keep the tile shape, shadow and rounded face; only the inside
  changes. Verify on a real phone at 360 and 390 px before merging.
- [Red/green index for colour-blind players] → Faded artwork remains as a shape cue; the magnifier shows full art.
  A colour-blind palette for the index is a follow-up if needed.
- [The user turns labels off and expects artwork everywhere] → The compact face ignores that setting by design; the
  setting text in DevPanel should say "corner labels".
- [Drawn tile far from the thumb on the left] → Try it; D3 makes flipping sides trivial.
- [Action row gets taller and the seat rows shrink] → About 12 px; pond sizing already adapts to row height.
- [Mouse hover code from `desktop-click-discard` may not be implemented yet] → D4 is written so the drawn slot works
  with the current touch/keyboard handlers; any later hover support treats the slot as a one-tile strip.

## Migration Plan

Pure client change, no data or API impact. Ship behind nothing; revert the two components if it plays badly.

## Open Questions

- Exact compact threshold (32 px) and index font ratio (0.62) are starting values to tune on device.
- Whether the drawn tile should sit right of the buttons for right-thumb reach (D3).
