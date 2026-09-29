## ADDED Requirements

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
- **THEN** only the base seconds are shown, with no bank number

#### Scenario: Player acts
- **WHEN** the player discards or calls and the deadline is cleared
- **THEN** no number is visible

#### Scenario: Warning ticks unchanged
- **WHEN** 5 or fewer seconds remain before the server acts for the player
- **THEN** the warning tick plays once per second as before

## MODIFIED Requirements

### Requirement: Timer bar does not shift the layout
On a timed (online) table the player's own decision timer SHALL occupy a slot of constant size for the whole game,
whether or not a deadline is pending. The slot SHALL be sized for the numeric display. Appearing, counting down,
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
