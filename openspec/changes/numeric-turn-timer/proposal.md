## Why

The player's own decision timer is a 3 px bar that drains; it is hard to read at a glance, and a bar's length says
nothing about how many seconds are actually left. With 5 s turns, a 10 s dealer opening and a 20 s bank, players
need to know "3 seconds left" without judging a sliver of colour. Numbers counting down read instantly, like a chess
clock.

## What Changes

- The own decision timer (`TimerBar`) no longer shows a draining bar. It shows the **remaining whole seconds** as a
  number counting down, once per second.
- During the base time the number shows the base seconds left in the neutral ink colour; the remaining **time bank**
  is shown next to it as a smaller gold number, so the player always knows their reserve.
- When the base time runs out, the timer switches to the bank: the main number becomes the bank seconds, in gold
  (gold keeps its existing timer meaning: "you are spending your bank"). The separate bank number disappears.
- The timer sits just below the tile-to-act slot, in the empty space above the hand, taking no layout space: no row,
  and the board gets back the 3 px + gap the bar took. Nothing moves when it appears or changes. Offline: no timer.
- Unchanged: server timer values and semantics, bank accounting, the warning ticks in the last 5 s, the pre-deal
  `Countdown` overlay.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `table-timer-bar` (introduced by the not-yet-archived `stable-timer-bar-layout` change): the own timer is shown as
  seconds counting down instead of a draining bar; the layout requirement stays, but the timer now sits between
  the tile slot and the hand and reserves no row. Archive `stable-timer-bar-layout` first.

## Impact

- `apps/web/src/lib/components/TimerBar.svelte`: bar replaced by the numeric display (base number + small bank
  number, bank mode in gold); same props, same tick effect.
- `apps/web/src/lib/components/PlayerArea.svelte`: optional `timer` snippet rendered in the middle slot.
- `apps/web/src/lib/components/Table.svelte`: passes `TimerBar` to `PlayerArea` as that snippet instead of its own row.
- `docs/agents/ui.md`: describe the numeric own timer.
- No protocol, game-server or engine changes. Fair play: only the player's own deadline and bank, both already sent.
