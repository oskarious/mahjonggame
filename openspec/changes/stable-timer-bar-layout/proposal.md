## Why

In online games the board jumps whenever the player's own decision timer appears or disappears. `TimerBar` is only
mounted while a deadline is pending, so each time it mounts it adds its 3 px height plus a 6 px flex gap to the
table's column and the board (`flex: 1`) shrinks by ~9 px — and grows back when the player acts. This happens on
every own turn and every call decision, right where the player is aiming a tap, so it is both ugly and a mis-tap risk.

## What Changes

- The online table reserves a fixed slot for the timer bar for the whole game; the bar only becomes visible inside
  that slot while a deadline is pending. Showing, draining, switching to the bank and hiding the timer never move
  the board or the hand.
- Offline tables (no timer) keep their current layout: no slot is reserved.
- No change to timer semantics, the bank display, the warning ticks or the server.

## Capabilities

### New Capabilities
- `table-timer-bar`: how the player's own decision timer is placed on the table, including that it never shifts the
  layout.

### Modified Capabilities
<!-- none: openspec/specs/ has no spec covering the timer display yet -->

## Impact

- `apps/web/src/lib/components/TimerBar.svelte`: always render the slot, hide its contents when no deadline.
- `apps/web/src/lib/components/Table.svelte`: render `TimerBar` only for timed (online) tables; new `timed` prop.
- `apps/web/src/routes/online/+page.svelte`: pass `timed`.
- `docs/agents/ui.md`: note the fixed timer slot.
