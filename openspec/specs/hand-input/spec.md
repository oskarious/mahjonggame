# hand-input Specification

## Purpose
TBD - created by archiving change desktop-click-discard. Update Purpose after archive.
## Requirements
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
For touch and pen pointers the system SHALL keep the existing behaviour: press shows the magnifier, flicking up is the
only way to discard, a tap neither selects nor discards, and off-turn presses only inspect. Input handling SHALL be
decided per pointer event type, so one device can use both.

#### Scenario: Touch tap only inspects
- **WHEN** the player taps a discardable tile with a finger without flicking
- **THEN** no action is sent and no selection is made

#### Scenario: Touch flick discards
- **WHEN** on the player's turn they press a discardable tile and flick upward past the discard threshold
- **THEN** a discard action for that tile is sent

#### Scenario: Mixed input on one device
- **WHEN** a player on a touchscreen laptop hovers and clicks with the mouse, then taps with a finger
- **THEN** the mouse click discards directly and the finger tap follows the touch rules

### Requirement: Drawn tile slot accepts hand gestures
The drawn tile slot in the action row SHALL accept the same input as a hand strip tile: press shows it as the tile
being looked at (matching copies on the board highlighted, hint preview when available), tap selects it, tapping it
again discards (or one tap discards when the one-tap setting is on), flicking up discards, riichi mode applies, and
keyboard activation selects or discards it. Off turn the slot is empty, so it accepts no input.

#### Scenario: Tap to select, tap again to discard
- **WHEN** one-tap discard is off and the player taps the drawn tile twice
- **THEN** the first tap selects it and the second sends a discard action for it

#### Scenario: Flick discards
- **WHEN** the player presses the drawn tile and moves the finger up past the flick distance before release
- **THEN** a discard action for the drawn tile is sent

#### Scenario: Riichi with the drawn tile
- **WHEN** riichi mode is active and the drawn tile is a legal riichi discard
- **THEN** the tile is shown as playable and discarding it sends the discard with `riichi: true`

#### Scenario: Press highlights copies
- **WHEN** the player presses and holds the drawn tile
- **THEN** copies of its kind on the board get the blue highlight and the hint preview (if provided) shows its discard

#### Scenario: Selecting a strip tile deselects the drawn tile
- **WHEN** the drawn tile is selected and the player taps a strip tile
- **THEN** the strip tile becomes the selected tile and the drawn tile is no longer selected

### Requirement: Drawn tile slot has no slide
A press that starts on the drawn tile SHALL stay on the drawn tile: moving sideways SHALL NOT pick a strip tile, and a
press that starts on the strip SHALL NOT pick the drawn tile. The magnifier SHALL be shown above the drawn tile while
it is pressed or selected, exactly as for a strip tile (gold when the flick is armed).

#### Scenario: Slide from drawn tile into the strip
- **WHEN** the player presses the drawn tile and slides the finger down over the strip, then releases
- **THEN** the release acts on the drawn tile (select or discard per the tap rules), not on a strip tile

#### Scenario: Slide from the strip toward the drawn tile
- **WHEN** the player presses a strip tile and slides sideways past the end of the strip
- **THEN** the nearest strip tile stays picked; the drawn tile is never picked

#### Scenario: Magnifier above the drawn tile
- **WHEN** the player presses the drawn tile
- **THEN** the magnifier appears above the drawn tile, not above the strip, and turns gold when the flick is armed

### Requirement: Touch discards only by flick
For touch and pen pointers, flicking up SHALL be the only way to discard from the hand strip or the drawn slot.
A press SHALL inspect the tile while held (magnifier, board highlight, discard preview when hints provide it); a
release without a flick SHALL neither select the tile nor discard it, so there is no tap-again discard and the
one-tap discard setting SHALL NOT apply to touch. Mouse and keyboard input keep the select / activate behaviour.

#### Scenario: Touch tap does nothing on release
- **WHEN** the player taps a discardable hand tile with a finger and lifts without moving up
- **THEN** no tile becomes selected, no magnifier stays up, and no action is sent

#### Scenario: Two touch taps do not discard
- **WHEN** the player taps the same hand tile twice with a finger
- **THEN** no action is sent

#### Scenario: One-tap setting ignored for touch
- **WHEN** the one-tap discard setting is on and the player taps a hand tile with a finger
- **THEN** no action is sent

#### Scenario: Touch flick still discards
- **WHEN** the player presses a discardable tile with a finger and moves up past the flick distance before release
- **THEN** a discard action for that tile is sent

#### Scenario: Press shows the discard preview
- **WHEN** hints include discard options and the player holds a finger on a discardable tile
- **THEN** the hint area shows that tile's discard preview until the finger lifts

