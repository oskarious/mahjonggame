## Context

`PlayerArea.svelte` treats the whole hand strip as one pointer target: `pointerdown` picks the nearest tile
(`tileAt`) into `press`, `pointermove` tracks sideways sliding and the upward flick, `pointerup` calls
`tap(tile, flick)`, which selects or discards. `press ?? selected` drives the magnifier (`magnified`) and the board
highlight (`focusKind`); `selected` alone drives the hint `preview`. Tile `onclick` is only used for keyboard
activation (`keyTap`, `e.detail === 0`). This all runs for mouse too, so desktop currently needs select + click again.

## Goals / Non-Goals

**Goals:**
- Mouse: hover = inspect (same cues as a touch selection), single left click = discard.
- Touch/pen behaviour byte-for-byte unchanged.
- Works on hybrid devices (decide per event, not per device).

**Non-Goals:**
- Keyboard shortcuts for discarding (existing keyboard activation stays as is).
- Drag-and-drop discarding with the mouse, undo, or confirm dialogs.
- Changing the one-tap setting; it simply doesn't apply to mouse input.

## Decisions

**Branch on `e.pointerType === 'mouse'` inside the existing strip handlers** rather than a `(hover: hover)` media
query or a separate component. Per-event branching handles touchscreen laptops and keeps one code path for tile
picking (`tileAt`). Pen stays on the touch path (no reliable hover, flick is natural).

**New `hovered: { tile, x } | null` state.** Set on mouse `pointermove` (buttons up) via `tileAt`, cleared on
`pointerleave` and on every new game state (the existing `view.seq` effect). Derivations become:
- `magnified = press ?? hovered ?? selected-at-selectedX`
- `focus = press ?? hovered ?? selected`
- `preview` uses `hovered ?? selected` (hover wins, so a leftover touch selection doesn't mask the hovered tile).

Alternative considered: reuse `selected` for hover. Rejected: selection has "tap again = discard" meaning and survives
pointer leave; mixing them would make touch after mouse surprising.

**Mouse click = discard on release, same tile only.** On mouse `pointerdown` (button 0) record `press` as today (so the
tile shows pressed feedback), but don't start flick logic; on `pointerup` discard if `tileAt(up.x)` is the pressed tile
and `canDiscard`. No `selected` is ever set by the mouse. Reuse `discard()` so riichi mode works unchanged.
Alternative: discard on `pointerdown` (faster). Rejected: no way to cancel a misclick; release-on-same-tile is the
standard button contract.

**Hover target uses nearest-tile, like touch.** Keeps "no dead zones" and one picking function. The strip's padding
above the tiles therefore also hovers; acceptable and consistent with the magnifier position.

**Keep the magnifier on hover.** It is the existing inspection cue and makes red fives / small tiles readable; the
visual language (blue glow only for the held/selected tile) extends naturally to "hovered".

## Risks / Trade-offs

- [Misclick discards are irreversible] → release-on-same-tile cancel; dimmed tiles ignore clicks; right/middle
  buttons ignored. Matches how other online mahjong clients behave.
- [Magnifier may feel noisy while sweeping the mouse across the hand] → it's pointer-events: none and follows the
  cursor; revisit (e.g. hide on mouse, rely on raised tile) if it annoys in practice.
- [Hover state stuck after the hand re-renders under a still cursor] → cleared on `view.seq`; next mouse move
  re-establishes it.
- [Touch devices emitting compatibility mouse events] → pointer events carry the real `pointerType`, so no double
  handling.
