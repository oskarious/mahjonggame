## ADDED Requirements

### Requirement: Mouse hover inspects a tile
When a mouse pointer hovers over the hand strip, the system SHALL treat the nearest hand tile as the inspected tile:
it SHALL show the magnifier for it, highlight matching copies on the board (blue glow), and, when the hint level
provides discard options, show that tile's discard preview. Hovering SHALL NOT change the game state or create a
selection.

#### Scenario: Hover shows inspection cues
- **WHEN** the mouse moves over a tile in the player's hand
- **THEN** the magnifier shows that tile and copies of its kind on the board get the blue highlight

#### Scenario: Hover drives the hint preview
- **WHEN** hints include discard options and the mouse hovers a discardable tile on the player's turn
- **THEN** the hint area shows the preview for discarding that tile

#### Scenario: Leaving the hand clears hover
- **WHEN** the mouse leaves the hand strip
- **THEN** the magnifier and board highlight for the hovered tile disappear

#### Scenario: Hover works off-turn
- **WHEN** it is not the player's turn and the mouse hovers a hand tile
- **THEN** the tile is inspected (magnifier, highlight) and nothing else happens

### Requirement: One mouse click discards
On the player's turn, a primary-button mouse click on a discardable tile SHALL discard that tile immediately, without
a separate selection step and regardless of the one-tap discard setting. In riichi mode the click SHALL discard with
riichi if the tile is a legal riichi discard.

#### Scenario: Click discards on turn
- **WHEN** it is the player's turn and they left-click a discardable tile
- **THEN** a discard action for that tile is sent

#### Scenario: Click in riichi mode declares riichi
- **WHEN** riichi mode is active and the player left-clicks a tile that is a legal riichi discard
- **THEN** a discard action with `riichi: true` for that tile is sent

#### Scenario: Click on a non-discardable tile
- **WHEN** the player left-clicks a tile that cannot be discarded (dimmed, or not a riichi discard in riichi mode)
- **THEN** no action is sent

#### Scenario: Click off-turn
- **WHEN** it is not the player's turn and they left-click a hand tile
- **THEN** no action is sent and no selection is made

#### Scenario: Other buttons are ignored
- **WHEN** the player right- or middle-clicks a hand tile
- **THEN** no action is sent

### Requirement: Mouse click requires press and release on the same tile
A mouse discard SHALL only happen if the primary button is pressed and released over the same tile. Moving to a
different tile (or off the strip) before release SHALL cancel the click.

#### Scenario: Drag to another tile cancels
- **WHEN** the player presses the mouse button on one tile and releases it over a different tile
- **THEN** no action is sent

### Requirement: Touch and pen input unchanged
For touch and pen pointers the system SHALL keep the existing behaviour: press shows the magnifier, tap selects and
tapping the selected tile discards (or one tap discards when the one-tap setting is on), flicking up discards, and
off-turn presses only inspect. Input handling SHALL be decided per pointer event type, so one device can use both.

#### Scenario: Touch tap still selects
- **WHEN** one-tap discard is off and the player taps a discardable tile with a finger
- **THEN** the tile becomes selected and no action is sent

#### Scenario: Mixed input on one device
- **WHEN** a player on a touchscreen laptop hovers and clicks with the mouse, then taps with a finger
- **THEN** the mouse click discards directly and the finger tap follows the touch rules
