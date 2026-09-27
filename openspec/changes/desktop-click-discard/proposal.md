## Why

Hand input was designed for one thumb on a phone: press to inspect, tap to select, tap again (or flick up) to
discard. With a mouse that is two clicks per discard and "press to inspect" has no natural equivalent, so desktop play
feels slow and clumsy. A mouse can hover, which gives inspection for free and frees the click to mean "discard".

## What Changes

- **Mouse hover highlights**: moving the mouse over the hand shows, for the hovered tile, everything a touch
  selection shows today: the magnifier, blue glow on matching copies on the board, and (if hints are on) the discard
  preview (tiles away / waits / useful tiles). Leaving the hand clears it.
- **One click discards**: on your turn, a left click on a discardable tile discards it immediately (also in riichi
  mode, where it declares riichi with that tile). No select-then-confirm step for the mouse.
- Mouse clicks never create a persistent selection; off-turn clicks do nothing (hover already inspects).
- A click only counts if the button is pressed and released on the same tile, so dragging off a tile cancels.
- Touch and pen input are unchanged (press/magnifier, tap-select + tap-again, flick up, one-tap setting).
- Behaviour is chosen **per pointer event** (`pointerType === 'mouse'`), not per device, so touchscreen laptops work
  with both.

## Capabilities

### New Capabilities
- `hand-input`: how the player picks, inspects and discards tiles from their hand, per input type (touch/pen vs mouse,
  plus keyboard activation).

### Modified Capabilities
<!-- none: no specs exist yet in openspec/specs/ -->

## Impact

- `apps/web/src/lib/components/PlayerArea.svelte`: pointer handlers, new hover state feeding magnifier / `focusKind` /
  hint preview.
- `AGENTS.md` "UI conventions" hand-input paragraph gets the desktop rule.
- No engine, server or protocol changes.
