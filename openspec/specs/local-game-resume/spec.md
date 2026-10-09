# local-game-resume Specification

## Purpose
TBD - created by archiving change local-game-autosave. Update Purpose after archive.
## Requirements
### Requirement: Offline games are saved after every action
The web client SHALL store the current offline game in `localStorage` after every applied action, whether made by the
player or a bot. The save SHALL contain a format version, the rule set, the seed, the human seat, the local settings
and the complete action log. Only one offline game SHALL be saved at a time.

#### Scenario: Save after the player's discard
- **WHEN** the player discards a tile in an offline game
- **THEN** the stored save contains that discard as the last action of its log

#### Scenario: Save after bot actions
- **WHEN** a bot acts while the player waits
- **THEN** the stored save includes the bot's action

#### Scenario: Starting a new game replaces the save
- **WHEN** a new offline game starts while another one is saved
- **THEN** the save holds only the new game

### Requirement: Saving never breaks play
Reading, writing and removing the save SHALL NOT throw into the game. When storage is unavailable or full, the game
SHALL continue normally without being saved.

#### Scenario: Storage blocked
- **WHEN** `localStorage` access throws (private mode, blocked site data, quota exceeded)
- **THEN** the game plays normally and no error is shown

### Requirement: /play resumes the saved game
Opening `/play` without query parameters SHALL resume the saved game, if there is one, by creating the game from its
rules and seed and replaying its action log, with the saved human seat and settings. Without a save it SHALL start a
new game with default settings.

#### Scenario: Reload mid-hand
- **WHEN** the player reloads `/play` in the middle of a hand
- **THEN** the same game appears at the same point: same hand, same seat, same discards, same scores

#### Scenario: No save
- **WHEN** the player opens `/play` and nothing is saved
- **THEN** a new game starts with default settings

#### Scenario: Resume between hands
- **WHEN** the save ends with a finished hand
- **THEN** the hand result is shown and the player can continue to the next hand

### Requirement: /play with parameters starts a new game
Opening `/play` with query parameters (preset, length, bots, hints, seed) SHALL start a new game from those
parameters and replace the save. The address SHALL then be replaced with `/play` without adding a history entry, so a
reload resumes the new game.

#### Scenario: New game from the home page
- **WHEN** the player starts a game from the home page form while a game is saved
- **THEN** a new game with the chosen options starts and the address becomes `/play`

#### Scenario: Reload after starting
- **WHEN** the player reloads right after starting that game
- **THEN** the same game resumes instead of a new one starting

### Requirement: Finished and unusable saves are removed
The save SHALL be removed when the game reaches game over. A save that cannot be parsed, has an unknown format version
or fails to replay SHALL be discarded, and a new game SHALL start instead.

#### Scenario: Game over
- **WHEN** the final hand ends and the game is over
- **THEN** no save remains, and reopening `/play` starts a new game

#### Scenario: Replay fails
- **WHEN** a saved log contains an action the current engine rejects
- **THEN** the save is removed and a new game starts without an error screen

### Requirement: Home page offers Continue
When an offline game is saved, the home page SHALL show a Continue button that opens the saved game, labelled with
the saved game's round (e.g. "East 3"), alongside the New game action that starts a new game from the form. Without a
save, only New game SHALL be shown.

#### Scenario: Saved game present
- **WHEN** the player opens the home page with a saved game
- **THEN** Continue and New game are both shown, and Continue opens `/play` with that game

#### Scenario: No saved game
- **WHEN** the player opens the home page with nothing saved
- **THEN** no Continue button is shown

