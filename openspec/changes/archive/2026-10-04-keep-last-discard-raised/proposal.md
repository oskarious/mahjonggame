## Why

The newest discard is raised off its pond row only while a call window is open, i.e. only when *someone* could call it.
Most discards can't be called, so the tile drops flat the instant it lands and the next player draws: at a glance you
can't tell what was just thrown or who threw it. The raise should mark "the last discard" consistently, which also
stops it from acting as a visual tell of the call window.

## What Changes

- The most recent discard stays raised in its pond from the moment it is discarded until the next discard by anyone,
  whether or not a call window opened for it.
- When the discard is claimed (pon / chii / open kan) it is no longer "in play" in the pond (it is dimmed and moves to
  the caller's meld), so the raise is cleared; nothing is raised until the caller discards.
- A draw, a closed or added kan, or a riichi declaration without a discard yet do not clear it; only the next discard
  (or a claim, or the next hand) does.
- At the start of a hand nothing is raised.
- The player view gets a public `lastDiscard: { seat, tile } | null` field that the pond uses instead of `claimable`.

## Capabilities

### New Capabilities
- `pond-display`: how discards are shown in the ponds; this change adds the requirement that the last discard stays
  raised until the next discard or a claim.

### Modified Capabilities
<!-- none: openspec/specs has no pond spec yet -->

## Impact

- `packages/engine/src/game.ts`: `HandState.lastDiscard` set in `discard()`, cleared in `applyCall()`, null at hand start.
- `packages/engine/src/view.ts`: `PlayerView.lastDiscard` (public information: all discards and their order are public).
- `packages/engine/test/helpers.ts` (`rig()`) and any hand-built `HandState` need the new field.
- `apps/web/src/lib/components/Board.svelte` / `Pond.svelte`: mark from `view.lastDiscard` instead of `view.claimable`.
- Protocol: `PlayerView` gains an additive field. No wall/replay change: stored action logs replay identically, no
  `SAVE_VERSION` bump.
- Fair play: the field is derived only from public actions, so `scrambleHidden` needs no change and the fairness tests
  keep passing; it also removes a small visible difference between "callable" and "not callable" discards.
