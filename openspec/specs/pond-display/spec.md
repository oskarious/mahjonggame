# pond-display Specification

## Purpose
TBD - created by archiving change keep-last-discard-raised. Update Purpose after archive.
## Requirements
### Requirement: Last discard stays raised until the next discard
The pond SHALL show the most recent discard of the hand raised off its row (the existing "last" mark) from the moment
it is discarded until the next discard by any seat, regardless of whether a call window opened for it. At most one
pond tile SHALL be raised at a time.

#### Scenario: Discard nobody can call
- **WHEN** a seat discards a tile that no other seat can call, and the next seat draws
- **THEN** that tile stays raised in the discarder's pond while the next seat is deciding its discard

#### Scenario: Discard with a call window
- **WHEN** a seat discards a tile and a call window opens for it
- **THEN** the tile is raised during the call window, and stays raised after everyone passes and the next seat draws

#### Scenario: Next discard moves the mark
- **WHEN** the next seat discards
- **THEN** the new discard is raised and the previous one lies flat

#### Scenario: Kan without a discard
- **WHEN** after a discard the next seat draws and declares a closed or added kan (drawing a replacement tile)
- **THEN** the previous discard stays raised until that seat discards

### Requirement: A claimed discard is not raised
When the last discard is claimed into a meld (pon, chii or open kan), the pond SHALL no longer raise it, and no pond
tile SHALL be raised until the next discard.

#### Scenario: Pon
- **WHEN** a discard is claimed by pon
- **THEN** the claimed tile in the discarder's pond is dimmed and not raised, and no other pond tile is raised until the caller discards

### Requirement: No raised discard at hand start
At the start of each hand no pond tile SHALL be raised.

#### Scenario: New hand
- **WHEN** a new hand starts
- **THEN** no pond tile is raised until the first discard

### Requirement: Last discard is public view state
The player view SHALL include the last discard (`seat` and `tile`, or null), derived only from public actions, so it is
identical on a state whose hidden information has been scrambled and survives reconnects and resyncs.

#### Scenario: Reconnect
- **WHEN** a client reconnects or resyncs mid-turn
- **THEN** the received view marks the same last discard as before the disconnect

#### Scenario: Fairness
- **WHEN** the fairness tests compare views of a state and its `scrambleHidden` counterpart
- **THEN** `lastDiscard` is identical in both

