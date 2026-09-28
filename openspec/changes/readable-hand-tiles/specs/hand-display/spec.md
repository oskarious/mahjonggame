## ADDED Requirements

### Requirement: Hand tile size follows the number of tiles held
The hand strip SHALL size its tiles so that the concealed tiles it shows fill the available width, dividing the
strip width by the number of concealed tiles shown, capped at the existing maximum tile width. The drawn tile SHALL
NOT count toward this number.

#### Scenario: Closed hand
- **WHEN** the player holds 13 concealed tiles on a 390 px wide phone
- **THEN** each hand tile is about 28 px wide (strip width divided by 13)

#### Scenario: Open hand gets bigger tiles
- **WHEN** the player has called one meld and holds 10 concealed tiles
- **THEN** hand tiles are wider than with 13 tiles, by the ratio 13/10, up to the maximum tile width

#### Scenario: Size is stable across the turn
- **WHEN** the player draws a tile and then discards it
- **THEN** the size and positions of the 13 strip tiles do not change

### Requirement: Larger corner index on hand tiles
Own-hand tiles (the strip and the drawn tile) SHALL show the regular artwork face with a corner index larger than
on the board: 40 % of the tile width, and 48 % when the tile is narrower than 32 px. Pond, meld and opponent tiles
SHALL keep the board index size. The index SHALL never replace or fade the artwork.

#### Scenario: Phone-size hand
- **WHEN** the hand strip yields 27 px tiles
- **THEN** each strip tile shows full artwork with a 13 px corner index

#### Scenario: Desktop hand
- **WHEN** the hand strip yields 41 px tiles
- **THEN** each strip tile shows full artwork with a 16 px corner index

#### Scenario: Pond tiles unaffected
- **WHEN** pond tiles are 20 px wide
- **THEN** they keep the board index size (hidden below 16 px as before)

#### Scenario: Corner-label setting still applies
- **WHEN** the tile labels setting is off
- **THEN** hand tiles show no index, like every other tile

### Requirement: Drawn tile is shown in the action row
On the player's turn, the tile drawn this turn SHALL be shown at the left of the action row, at about 44 px wide,
in the position the claimable tile occupies during a call window. It SHALL NOT appear in the hand strip. When there
is no drawn tile (off turn, or discarding after a call) the slot SHALL be empty.

#### Scenario: Drawn tile after a normal draw
- **WHEN** it is the player's turn after drawing from the wall
- **THEN** the drawn tile is shown large at the left of the action row and the strip shows the other 13 tiles

#### Scenario: Discard after a call
- **WHEN** the player has just called pon or chii and must discard
- **THEN** the action row has no drawn tile and the strip shows all concealed tiles

#### Scenario: Off turn
- **WHEN** it is not the player's turn
- **THEN** the action row shows no drawn tile (and the claimable tile when in a call window)

#### Scenario: Drawn tile carries hand cues
- **WHEN** the drawn tile is dora, is the suggested discard at hint level full, or is not discardable in riichi mode
- **THEN** it shows the gold glow, the green dot, or the dimmed state respectively, like a strip tile

### Requirement: Game information lives in the own panel
The round information formerly shown in a bar above the seat rows (round wind and number, honba and riichi sticks,
dora as indicator → dora, wall count) SHALL be shown in the player's own panel: round and sticks over the hints on
the left, dora over the wall count and the settings cog on the right. The panel SHALL be exactly as tall as the
middle tile slot and SHALL NOT change height when buttons appear. The middle slot SHALL hold the drawn tile on the
player's turn or the claimable tile during a call window. There SHALL be no separate round bar above the seat rows.

#### Scenario: Panel shows the round info
- **WHEN** a hand is in progress with nothing to decide
- **THEN** the own panel shows the round and dealer number, honba count, every dora indicator with its dora, the
  number of tiles left in the wall and the settings cog, and no round bar appears above the seat rows

#### Scenario: Panel height is the tile slot
- **WHEN** the player is off turn with no call window, on turn, or in a call window
- **THEN** the panel is the same height in all three states

### Requirement: Action buttons overlay the panel sides
When the player has something to decide, the choice buttons (Tsumo, Riichi, Kan, Abort hand on turn; Ron, Pon,
Chii, Kan in a call window; the kan or chii options while picking) SHALL cover the left side of the panel, hiding
the round info and hints, laid out two per row; Pass (or Back while picking) SHALL cover the right side, hiding the
dora, wall count and cog. When nothing is to decide, no buttons SHALL be shown and the information SHALL be visible.

#### Scenario: Call window
- **WHEN** another player discards a tile the player can call
- **THEN** that tile is shown in the middle slot, the call buttons cover the left side two per row, and a Pass
  button covers the right side

#### Scenario: Riichi available on turn
- **WHEN** it is the player's turn and riichi is possible
- **THEN** the Riichi button (with Tsumo or Kan if available) covers the left side and the right side keeps showing
  the dora, wall count and cog

#### Scenario: Buttons need more room
- **WHEN** three chii options are offered
- **THEN** the option buttons extend upward over the board rather than growing the panel
