## ADDED Requirements

### Requirement: Selectable tileset
The client SHALL offer two tilesets, **Classic** (the current 3:4 FluffyStuff artwork) and **Slim** (about 1:2),
chosen in the settings sheet under one "Tiles" control. The choice SHALL be stored per device (`riichi:tileset`)
and apply to offline and online games alike. Slim SHALL be the default when nothing (or an unknown value) is
stored or storage is unavailable. The choice SHALL NOT be sent to the server or change any game behaviour.

#### Scenario: Default
- **WHEN** a player opens a game on a device that never changed the setting
- **THEN** tiles are drawn with the Slim artwork at about 1:2

#### Scenario: Switch during a game
- **WHEN** the player selects Classic (or Slim) in the settings sheet during a game
- **THEN** every tile on screen (hand, drawn tile, ponds, melds, dora, magnifier, waits, result sheets) is drawn
  with that artwork at its ratio, without reloading, and the game continues unchanged

#### Scenario: Remembered
- **WHEN** the player chose Classic and later opens a new offline or online game
- **THEN** the game uses Classic

#### Scenario: Storage unavailable
- **WHEN** reading or writing localStorage throws
- **THEN** the game shows Slim tiles and the setting still works for the current page

### Requirement: Tile ratio follows the tileset
A tile's height SHALL be its width times the selected tileset's ratio (Classic 4/3, Slim 119/60). Sideways tiles
(called tiles, riichi discards) SHALL swap the two. No layout SHALL assume a fixed 4/3 ratio.

#### Scenario: Upright tile
- **WHEN** a Slim tile is 24 px wide
- **THEN** it is about 48 px tall

#### Scenario: Sideways tile
- **WHEN** a Slim riichi discard is shown in a pond of 24 px tiles
- **THEN** it takes about 48 px of width and 24 px of height, and its corner index stays upright

### Requirement: Layout adapts to the ratio
The layout SHALL keep its existing rules with the selected ratio:
- the hand strip divides the width by the number of concealed tiles (tile height = width × ratio), capped so a hand
  tile is never taller than the largest Classic hand tile (52 px wide, ~69 px tall);
- each pond is sized to fit 18 discards in its row, using the ratio for the height of discard lines and the meld line;
- a meld row accounts for sideways tiles as (ratio − 1) extra tile widths each;
- the own panel keeps the height of today (so the board above does not move when switching): every tile in it
  (drawn / claimable tile, dora and indicator, waits, call choices) keeps its Classic height and gets narrower
  with a taller ratio;
- the magnifier shows the tile at the tileset's ratio, at its Classic height.

#### Scenario: Pond fits 18 discards
- **WHEN** Slim is selected and a pond holds 18 discards on a 390 × 844 viewport
- **THEN** all 18 discards and that seat's melds are visible within its row without overlapping the next row

#### Scenario: Hand fills the width
- **WHEN** Slim is selected and the player holds 13 concealed tiles on a 390 px wide phone
- **THEN** the 13 strip tiles fill the strip width like Classic tiles do, and are taller than Classic tiles

#### Scenario: Open hand stays within the Classic height
- **WHEN** Slim is selected and the player has called two sets and holds 8 concealed tiles on a 360 px wide phone
- **THEN** each strip tile is about 35 px wide and 69 px tall (not 42 × 83)

#### Scenario: Own panel keeps its height
- **WHEN** the player switches between Classic and Slim
- **THEN** the own panel's height does not change

#### Scenario: Meld with a sideways tile
- **WHEN** Slim is selected and a seat has two pon melds
- **THEN** the meld line's width equals six tile widths plus two sideways extras of (ratio − 1) tile widths plus
  the set gaps, and the melds are not clipped

### Requirement: Overlays work on both tilesets
Every mark drawn on a tile SHALL look and behave the same on both tilesets: the corner index (and the tile labels
setting), dora / focus tint and glow, dimming, the suggested-discard dot, the raised last discard / winning tile,
face-down backs, and the white dragon's frame.

#### Scenario: Dora on a slim tile
- **WHEN** Slim is selected and a pond tile is dora
- **THEN** it has the gold tint and glow over the whole tile face

#### Scenario: Labels off
- **WHEN** Slim is selected and the tile labels setting is off
- **THEN** no tile shows a corner index

### Requirement: Slim glyphs use the device's fonts
The character and honor glyphs of the Slim set SHALL be drawn as text with the device's own fonts: Malgun Gothic
Bold where installed, otherwise the system's bold sans-serif (Japanese forms preferred). No font file SHALL be
shipped. On every device the glyphs SHALL stay inside the tile face, readable and not clipped. The tile body SHALL
be transparent so the client's tile face colour, edge and shadow apply as for Classic.

#### Scenario: Windows
- **WHEN** a Slim character tile is shown on Windows
- **THEN** its numeral and 萬 glyph are drawn in Malgun Gothic Bold, as designed

#### Scenario: Phone without Malgun Gothic
- **WHEN** a Slim character or wind tile is shown on an Android phone or an iPhone
- **THEN** its glyphs are drawn in the system's bold CJK sans-serif, inside the tile face and not clipped

#### Scenario: White dragon
- **WHEN** a Slim white dragon is shown
- **THEN** it has the same face colour as other Slim tiles
