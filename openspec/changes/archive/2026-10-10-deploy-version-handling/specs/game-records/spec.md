## MODIFIED Requirements

### Requirement: Resume after restart
On startup, the game server SHALL reload every unfinished game from its record, rebuild its state by replay, restart the
timer for the pending decision, and let the seated players reconnect to it. Each game SHALL record the engine version it
was created under. An unfinished game whose engine version differs from the running engine's, or whose log fails to
replay, SHALL NOT be resumed: it SHALL be marked aborted, with no result and no rating change. A player seated in an
aborted game SHALL be told on their next connection to the restarted server that it was cancelled and unrated.

#### Scenario: Crash mid-hand
- **WHEN** the game server stops unexpectedly during a hand and starts again
- **THEN** the game continues from the last stored action and players rejoin their seats

#### Scenario: Engine changed
- **WHEN** the game server starts with a different engine version than a running game was created under
- **THEN** that game is aborted without being replayed, and no seat's rating changes

#### Scenario: Log no longer replays
- **WHEN** a running game's stored log is rejected by the engine on startup
- **THEN** that game is aborted, and no seat's rating changes

#### Scenario: Player told
- **WHEN** a player whose game was aborted on startup reconnects
- **THEN** they see a short cue that the game was cancelled and unrated, and are in the lobby
