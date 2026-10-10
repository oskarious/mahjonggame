The own turn timer: a 3px bar above the own panel that empties as time runs out.

Source: `apps/web/src/lib/components/TimerBar.svelte`.

- Track `line`, fill `ink-dim` while in the turn allowance; switches to `accent` when bank time is being spent, with the remaining seconds in `micro` gold, tabular.
- The slot is reserved for the whole online game and only hidden (not removed) when no deadline is pending, so the board never jumps.
- Fill animates 100ms linear.
