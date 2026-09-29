## ADDED Requirements

### Requirement: Timer bar does not shift the layout
On a timed (online) table the player's own decision timer SHALL occupy a slot of constant size for the whole game,
whether or not a deadline is pending. Appearing, draining, entering the time bank (gold bar with seconds) and
disappearing SHALL NOT change the size or position of the board, the hand or any other table element.

#### Scenario: Own turn starts
- **WHEN** the player's decision deadline arrives in an online game
- **THEN** the timer bar becomes visible and the board and hand keep exactly the same position and size

#### Scenario: Player acts
- **WHEN** the player discards or calls and the deadline is cleared
- **THEN** the timer bar is hidden and the board and hand keep exactly the same position and size

#### Scenario: Bank in use
- **WHEN** the base time runs out and the timer switches to the time bank with its seconds shown
- **THEN** no table element moves

### Requirement: No timer slot on untimed tables
A table without a decision timer (offline play against bots) SHALL NOT reserve space for a timer bar.

#### Scenario: Offline game
- **WHEN** a player plays an offline game
- **THEN** the table layout is the same as before this change, with no empty timer slot
