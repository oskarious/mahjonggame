## MODIFIED Requirements

### Requirement: Deploys do not destroy games
Restarting or redeploying the game server SHALL NOT lose running games: on shutdown the server SHALL stop starting new
games and persist what it needs, and on startup it SHALL resume unfinished games (see game-records). Connected clients
SHALL reconnect automatically. The only exception SHALL be a deploy that changes the engine version: games started
under the old version are aborted unrated rather than finished under different rules.

#### Scenario: Redeploy mid-game
- **WHEN** the game server is restarted while games are running
- **THEN** after it comes back, players are reconnected to the same games in the same state (timers restart for the current decision)

#### Scenario: Redeploy with engine change
- **WHEN** the game server is redeployed with a new engine version while games are running
- **THEN** those games are aborted unrated and their players are told on reconnect
