## Context

`Table.svelte` lays the screen out as a flex column (`gap: 6px`): board wrapper (`flex: 1`), optional error line,
`TimerBar`, `PlayerArea`. `TimerBar` wraps everything in `{#if deadlineAt !== null}`, so the 3 px bar and its gap
come and go with each deadline, and the flexible board absorbs the difference. The bank seconds are already
absolutely positioned above the bar and don't affect layout. Offline tables never have a deadline, so they never
render the bar.

## Goals / Non-Goals

**Goals:**
- Zero layout movement when the own timer appears, changes mode or disappears in online games.
- Offline layout unchanged.

**Non-Goals:**
- The error line (`game.error`) also inserts itself into the column and shifts the board; it is rare and out of scope.
- Any change to timer values, bank logic, warning sounds or visuals of the bar itself.

## Decisions

- **Reserve the slot, hide the contents.** `TimerBar` always renders its track element; with no deadline it gets
  `visibility: hidden` (fill at 0). Size is constant, so the column never reflows. Alternatives:
  - *Absolutely position the bar over the bottom of the board* — no reserved space at all, but it would overlap the
    board's bottom edge (own discards/seat info) and the bank seconds would sit on top of tiles.
  - *Animate height in/out* — still moves the board, just smoothly; the problem is the movement itself.
- **Only timed tables get the slot.** `Table` gets a `timed` boolean prop (default `false`); the online page passes
  `timed`. `Table` renders `TimerBar` only when `timed`. Inferring "online" from `players !== null` or
  `deadlineAt === undefined` was considered but couples unrelated props; an explicit flag reads clearly.
- The `now` interval stays gated on `deadlineAt !== null`, so the always-mounted bar costs nothing while idle.

## Risks / Trade-offs

- [Online board is permanently ~9 px shorter than today's no-timer state] → It already is that size for most of the
  game (every own turn and call); the stable size is the one players actually play at.
- [Hidden bar still announced/visible to tooling] → It is already `aria-hidden`; `visibility: hidden` also removes it
  from hit-testing and rendering.
