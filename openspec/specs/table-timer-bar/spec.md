# table-timer-bar Specification

## Purpose
TBD - created by archiving change stable-timer-bar-layout. Update Purpose after archive.
## Requirements
### Requirement: Timer bar does not shift the layout
On a timed (online) table the player's own decision timer SHALL NOT change the table layout for the whole game,
whether or not a deadline is pending; the numeric timer SHALL take no layout space of its own (it sits in the space
between the tile-to-act slot and the hand), so no row is reserved for it. Appearing, counting down,
changing digit count (e.g. `20` → `9`), entering the time bank (gold) and disappearing SHALL NOT change the size or
position of the board, the hand or any other table element.

#### Scenario: Own turn starts
- **WHEN** the player's decision deadline arrives in an online game
- **THEN** the timer numbers become visible and the board and hand keep exactly the same position and size

#### Scenario: Player acts
- **WHEN** the player discards or calls and the deadline is cleared
- **THEN** the timer is hidden and the board and hand keep exactly the same position and size

#### Scenario: Bank in use
- **WHEN** the base time runs out and the timer switches to the time bank
- **THEN** no table element moves

#### Scenario: Digit count changes
- **WHEN** the bank number goes from two digits to one
- **THEN** no table element moves

### Requirement: No timer slot on untimed tables
A table without a decision timer (offline play against bots) SHALL NOT reserve space for a timer bar.

#### Scenario: Offline game
- **WHEN** a player plays an offline game
- **THEN** the table layout is the same as before this change, with no empty timer slot

### Requirement: Own timer shows seconds counting down
The player's own decision timer SHALL show the remaining time as whole seconds (rounded up) that count down once per
second, not as a draining bar. During the base time it SHALL show the base seconds left in the neutral ink colour,
with the remaining time bank as a smaller gold number beside it. Once the base time has run out it SHALL show only the
bank seconds left, as the main number in gold. When no decision is pending no number SHALL be visible.

#### Scenario: Own turn starts
- **WHEN** the player's turn deadline arrives with 5 s base and 20 s bank
- **THEN** the timer shows `5` in ink with a small gold `20` beside it, and the `5` counts down to `1`

#### Scenario: Base time runs out
- **WHEN** the base time is used up and the player has not acted
- **THEN** the small bank number disappears and the main number shows the bank seconds left in gold, counting down

#### Scenario: Empty bank
- **WHEN** a deadline arrives and the player's bank is 0
- **THEN** the base seconds are shown with a small gold `0` beside them

#### Scenario: Player acts
- **WHEN** the player discards or calls and the deadline is cleared
- **THEN** no number is visible

#### Scenario: Warning ticks unchanged
- **WHEN** 5 or fewer seconds remain before the server acts for the player
- **THEN** the warning tick plays once per second as before

