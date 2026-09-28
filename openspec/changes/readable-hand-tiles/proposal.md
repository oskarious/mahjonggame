## Why

On phones the player's own hand is the hardest thing on screen to read and to hit: fourteen tiles share the column
width, so on a 360–390 px phone each tile is 23–25 px wide with ~20 px of artwork and an 8 px corner index. The hand
is width-bound (the seat rows above are flexible in height), so the fix is to get more legibility per pixel of width
and to buy a little width where it costs nothing, without changing the portrait, one-handed interaction model.

## What Changes

- **Compact tile face for small hand tiles.** Below a width threshold the hand tile shows a large suit-coloured index
  (1–9, E/S/W/N, Wh/G/R) as its primary face, with the artwork faded behind it, instead of a corner label over full
  artwork. Larger tiles (desktop, tablets) keep the artwork face unchanged. The magnifier keeps showing the full-size
  artwork tile.
- **Hand tiles are sized by how many are held.** The strip currently divides the column width by a constant 14.4 tile
  units. It will divide by the number of concealed tiles actually shown, so open hands (10, 7, 4 tiles after calls)
  get proportionally bigger tiles.
- **The drawn tile leaves the strip.** The tile drawn this turn is shown large (about 44 px) at the left of the
  action row, in the slot the claimable tile already uses off-turn, instead of as a 15th slot in the strip. It keeps
  every hand gesture (press to inspect, tap to select / tap again to discard, one-tap discard, flick up to discard,
  riichi mode, keyboard activation). The strip then holds 13 tiles (or fewer with melds) and stays the same size on
  and off turn.

Not in scope: overlapping/fanned tiles, two-row hands, landscape, edge-bleeding the strip, changes to pond tiles.

## Capabilities

### New Capabilities
- `hand-display`: how the player's own hand is rendered on the play screen: tile sizing from the tile count, the
  compact face for small tiles, and where the drawn tile is shown.

### Modified Capabilities
- `hand-input`: the drawn tile is no longer inside the hand strip; it must accept the same gestures from its own
  slot (press, tap, flick up, keyboard), with no sideways slide to neighbours and no magnifier (it is already large).

## Impact

- `apps/web/src/lib/components/Tile.svelte`: new `compact` prop and a container-query driven compact face.
- `apps/web/src/lib/components/PlayerArea.svelte`: `--tw` from tile count, drawn tile moved into `.actions`,
  pointer handling generalised so a press can originate from the drawn slot.
- No engine, view or server changes. No new dependencies. `AGENTS.md` UI conventions section needs a line about the
  compact face and the drawn tile position.
