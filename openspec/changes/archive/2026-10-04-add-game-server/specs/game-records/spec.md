## ADDED Requirements

### Requirement: Games are recorded as they are played
When an online game starts, the server SHALL store its rules, seed, format, start time and seats (account id or bot
skill, and starting rating per seat). Every applied action SHALL be appended to the game's record before the resulting
update is sent to players. When the game ends, the final standings and rating changes SHALL be stored.

#### Scenario: Action logged before broadcast
- **WHEN** a player discards a tile
- **THEN** the action is durably stored before any player receives the resulting update

#### Scenario: Finished game
- **WHEN** a game ends
- **THEN** its record contains the final standings, each human's rating change, and the end time

### Requirement: Records are replayable
Replaying a stored game's actions with the engine from its rules and seed SHALL reproduce exactly the same states,
results and final standings.

#### Scenario: Replay matches
- **WHEN** a finished game's record is replayed through the engine
- **THEN** the final standings equal the stored standings

### Requirement: Resume after restart
On startup, the game server SHALL reload every unfinished game from its record, rebuild its state by replay, restart the
timer for the pending decision, and let the seated players reconnect to it.

#### Scenario: Crash mid-hand
- **WHEN** the game server stops unexpectedly during a hand and starts again
- **THEN** the game continues from the last stored action and players rejoin their seats

### Requirement: Stuck games end
A game SHALL NOT stay unfinished forever: if no human has been connected for a configurable period, the server SHALL let
bots complete it and record the result normally.

#### Scenario: Everyone left
- **WHEN** all human players of a game have been disconnected for longer than the limit
- **THEN** bots play the remaining hands quickly, the game ends, and ratings are updated

### Requirement: Account deletion
Deleting an account SHALL remove the player's rating. Past game records SHALL be kept for the other players but SHALL
no longer be linked to the deleted account.

#### Scenario: Deleted player in old games
- **WHEN** a player who played online deletes their account
- **THEN** games they played remain for the other players, showing a placeholder instead of the deleted player
