# riichi-wait-preview Specification

## Purpose
TBD - created by archiving change riichi-wait-preview. Update Purpose after archive.
## Requirements
### Requirement: Riichi options in the player view
The view SHALL include riichi options on the player's own turn when at least one riichi discard is legal and the
hint level is "waits" or "full": `hints.riichi` holds one entry per distinct kind that can be discarded for riichi, each with the
kind, the waits after that discard (kind and copies the player cannot see) and whether the hand would be furiten
(a wait is among the player's discards, including the riichi discard itself). At levels "off" and "distance", between
turns, and when riichi is not legal, `hints.riichi` SHALL be absent or empty.

#### Scenario: Level waits, riichi available
- **WHEN** the hint level is "waits", it is the player's turn and discarding 1z or 2s both leave a closed tenpai hand
  with riichi legal
- **THEN** `hints.riichi` lists exactly 1z and 2s, each with its own waits and remaining counts
- **AND** `hints.discards` and `hints.ukeire` are still not sent

#### Scenario: Furiten riichi option
- **WHEN** a riichi discard leaves a wait on a kind the player has already discarded
- **THEN** that option has `furiten: true`

#### Scenario: Low hint levels
- **WHEN** the hint level is "off" or "distance"
- **THEN** no riichi waits are sent

#### Scenario: Riichi not legal
- **WHEN** the player is tenpai on their turn but riichi is not legal (open hand, fewer than 1000 points where
  required, or too few tiles left in the wall)
- **THEN** `hints.riichi` is empty

### Requirement: Wait preview while choosing a riichi discard
The play screen SHALL show, in riichi mode and attached to the magnifier of the tile being looked at (pressed on
touch, hovered or pressed with a mouse), the waits that riichi with that tile would leave, one small tile per wait
with its remaining count, and a furiten marker when that option is furiten. Tiles that cannot be discarded for riichi
SHALL show no waits. Outside riichi mode, the magnifier SHALL NOT show waits.

#### Scenario: Pressing a riichi-legal tile
- **WHEN** riichi mode is on and the player presses (or hovers) a tile that is riichi-legal
- **THEN** the magnifier shows that tile and, next to it, its resulting waits with counts

#### Scenario: Pressing a tile that breaks tenpai
- **WHEN** riichi mode is on and the player presses a tile that cannot be discarded for riichi
- **THEN** the magnifier shows the tile as blocked and no waits

#### Scenario: Riichi mode off
- **WHEN** riichi mode is off
- **THEN** the magnifier shows only the tile, as before

#### Scenario: No hints
- **WHEN** the hint level is "off" or "distance"
- **THEN** riichi mode behaves as before, without waits

