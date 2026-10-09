## Why

Choosing a riichi discard is the one decision that locks the hand, yet the play screen does not show what each
candidate discard would wait on. After riichi the waits appear (hint level "waits" and up), but while picking the
discard the player has to work the waits out themselves: at level "waits" the per-discard analysis is never sent on the
own turn, and even at "full" the preview line sits in the left panel, which the action buttons (Riichi, Tsumo, Kan)
cover exactly when riichi is available.

## What Changes

- **Riichi options in the hints.** On the own turn, when riichi is legal and the hint level is "waits" or "full", the
  view carries one entry per riichi-legal discard kind: the resulting waits (with copies left) and whether that
  riichi would be furiten. This reveals nothing beyond the level: the riichi-legal tiles are already known from the
  legal actions, and the waits are what the level shows as soon as the discard is made.
- **Wait preview while in riichi mode.** With riichi mode on, the tile being looked at (pressed with the finger,
  hovered or selected with the mouse) shows the waits that discarding it for riichi would leave, attached to the
  magnifier above the tile, plus a furiten marker when that riichi would be furiten. Tiles that cannot be discarded
  for riichi show no waits.
- The existing preview line and the post-riichi waits display are unchanged.

Not in scope: showing per-discard waits outside riichi mode at level "waits" (that stays "full"-only advice), scoring
or yaku previews, hint level changes for "off" / "distance".

## Capabilities

### New Capabilities
- `riichi-wait-preview`: which riichi discard options the view exposes at each hint level, and how the play screen
  shows the waits of the looked-at tile while choosing a riichi discard.

### Modified Capabilities
<!-- None: openspec/specs/ has no specs yet. -->

## Impact

- `packages/engine/src/view.ts`: `HandHints.riichi?: RiichiOption[]` filled in `handHints` from `analyzeSeat`'s
  discard options and the legal riichi actions; new tests in `packages/engine/test/analysis.test.ts`.
- `packages/protocol`: none beyond the `PlayerView` type it already re-exports (no message changes, no
  `PROTOCOL_VERSION` bump needed: the field is optional and additive).
- `apps/web/src/lib/components/PlayerArea.svelte`: waits row (and furiten chip) inside the magnifier in riichi mode.
- Game server: none; it already sends `viewFor` with the seat's hint level.
- `AGENTS.md`: a line on hint levels (riichi options at "waits").
