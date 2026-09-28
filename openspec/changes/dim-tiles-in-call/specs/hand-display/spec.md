## ADDED Requirements

### Requirement: Hand tiles dim during a call window except the tiles a call would use
The system SHALL dim hand tiles that no offered call would use. While the player has a call window open (at least
one of Ron, Pon, Chii or open Kan offered on another player's discard), the system SHALL dim every concealed hand tile that no offered call would take from the hand, using the
same dimmed look as tiles that cannot be discarded on the player's turn. The following tiles SHALL stay undimmed:
the tiles of every offered pon, the tiles of every offered chii, and, when an open kan is offered, every hand tile of
the claimable tile's kind. The claimable tile shown in the panel's middle slot SHALL NOT be dimmed. Ron SHALL NOT
undim any hand tile. Dimming SHALL be visual only: dimmed tiles SHALL remain inspectable (magnifier, board
highlight) exactly as off-turn tiles are.

#### Scenario: Pon offered
- **WHEN** another player discards 5p and the player, holding two 5p, is offered Pon (and Pass)
- **THEN** both 5p in the hand are undimmed, every other hand tile is dimmed, and the claimed 5p in the middle slot is undimmed

#### Scenario: Several chii shapes offered
- **WHEN** the left player discards 4s and the player is offered Chii with 2s-3s, 3s-5s and 5s-6s
- **THEN** the 2s, 3s, 5s and 6s tiles used by those options are undimmed and all other hand tiles are dimmed

#### Scenario: Red and plain five both usable
- **WHEN** a pon or chii is offered both with a red five and with a plain five of the same kind
- **THEN** the red five and the plain five are both undimmed

#### Scenario: Open kan offered
- **WHEN** the player holds three 7m and is offered open Kan on a discarded 7m
- **THEN** all three 7m in the hand are undimmed

#### Scenario: Ron only
- **WHEN** the only calls offered are Ron and Pass
- **THEN** every hand tile is dimmed and the claimable tile in the middle slot is undimmed

#### Scenario: Picking a chii option
- **WHEN** the player has pressed Chii and is choosing among several chii options
- **THEN** the hand keeps the same dimming as in the call window

#### Scenario: Dimmed tiles remain inspectable
- **WHEN** the player presses or hovers a dimmed tile during a call window
- **THEN** the magnifier shows it and copies of its kind get the board highlight, and no action is taken

#### Scenario: No call window
- **WHEN** it is not the player's turn and they have no call options
- **THEN** no hand tile is dimmed
