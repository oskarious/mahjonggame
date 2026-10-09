# online-play Specification

## Purpose
TBD - created by archiving change add-game-server. Update Purpose after archive.
## Requirements
### Requirement: Authenticated game connection
Online play SHALL require a signed-in account. The browser SHALL connect to the game server over a WebSocket at `/ws`
on the site's own domain, and the server SHALL identify the player from the existing session cookie. Connections
without a valid session SHALL be refused. Guests SHALL keep playing offline against bots in the browser as before.

#### Scenario: Signed-in player connects
- **WHEN** a signed-in user opens the online play screen
- **THEN** a WebSocket to `/ws` is opened on the same origin and the server knows the user's account id and username

#### Scenario: No session
- **WHEN** a WebSocket upgrade to `/ws` arrives without a valid session cookie
- **THEN** the server rejects it and no game or queue state is created

#### Scenario: Guest
- **WHEN** a guest opens the home screen
- **THEN** online play is not offered to them, and "Play vs bots" works exactly as before

### Requirement: Server is the only authority
The game server SHALL hold the full game state and apply every action through the engine. A client SHALL only ever
receive its own seat's view and its own redacted events: never other players' concealed tiles, the wall, the dead wall,
or which other players have call options. Actions SHALL be accepted only from the player assigned to that seat and only
when the engine lists them as legal.

#### Scenario: Redacted view
- **WHEN** any message is sent to a player during a hand
- **THEN** it contains no concealed tile of another seat and no wall or dead-wall tile beyond revealed dora indicators

#### Scenario: Illegal action
- **WHEN** a client sends an action that is not legal for its seat at that moment
- **THEN** the game state is unchanged, the client receives an error for that request, and the other players receive nothing

#### Scenario: Acting for another seat
- **WHEN** a client sends an action naming a seat that is not theirs
- **THEN** it is rejected like an illegal action

#### Scenario: No call-option leak
- **WHEN** a discard is made and some other player has a call option
- **THEN** players without an option receive no message that reveals that anyone is still deciding

### Requirement: Ordered, idempotent updates
Every state change SHALL carry an increasing sequence number. A client action SHALL reference the sequence number it was
based on; an action based on an outdated sequence number SHALL be rejected without effect. A client that missed updates
SHALL be able to request its current full view.

#### Scenario: Stale action
- **WHEN** a player sends a discard based on sequence 41 after the state has moved to sequence 42
- **THEN** the action is rejected and the client receives the current view

#### Scenario: Resync
- **WHEN** a client asks for a resync
- **THEN** it receives its full current view and the latest sequence number

### Requirement: Turn timers and time bank
Every decision a human player must make (own turn, call response) SHALL have a base time; after it runs out the
player's time bank SHALL drain; when both are exhausted the server SHALL play the engine's timeout action for them
(pass calls, otherwise discard the drawn tile). Players SHALL see the remaining time for their own decisions. Bots
SHALL act after a short natural-looking delay and never use the time bank.

#### Scenario: Decision within base time
- **WHEN** a player discards before their base time runs out
- **THEN** their time bank is unchanged

#### Scenario: Using the bank
- **WHEN** a player takes longer than the base time
- **THEN** the extra time is deducted from their time bank

#### Scenario: Timeout
- **WHEN** base time and time bank are both exhausted on the player's own turn
- **THEN** the server discards their drawn tile for them and play continues

#### Scenario: Timeout on a call
- **WHEN** base time and time bank are both exhausted while the player has a call option
- **THEN** the server passes for them

### Requirement: Disconnection and reconnection
When a player's connection drops during a game, the game SHALL continue: after a short grace period a bot SHALL play
their seat. When the player reconnects they SHALL resume control of the same seat from the current state. A player who
leaves never forfeits their seat to another human; the game is completed and rated as usual.

#### Scenario: Brief network blip
- **WHEN** a player's connection drops and comes back within the grace period
- **THEN** they continue their seat with no bot action taken for them beyond normal timeouts

#### Scenario: Bot takes over
- **WHEN** a player stays disconnected past the grace period
- **THEN** a bot makes that seat's decisions until the player reconnects

#### Scenario: Resume
- **WHEN** a disconnected player opens the site again while their game is running
- **THEN** they are taken back into that game at their seat with their current view

### Requirement: One active game per player
A player SHALL be in at most one queue or game at a time. Opening the online screen in a second tab or device SHALL
attach to the same queue entry or game and detach the previous connection.

#### Scenario: Second tab
- **WHEN** a player in a game opens the site in another tab
- **THEN** the new tab shows the running game and the old tab is told it has been taken over

#### Scenario: Queue while playing
- **WHEN** a player in a running game tries to join the queue
- **THEN** the request is refused and they are sent back to their game

### Requirement: Online table reuses the offline table
The online game SHALL use the same table screen, gestures, hint display and result sheets as offline play. Debug
controls (showing bots' hands, autoplay) SHALL NOT be available in online games. Hint level SHALL be decided by the
server (see ratings), not by client settings.

#### Scenario: Same table
- **WHEN** an online game starts
- **THEN** the player sees the same board, hand strip, magnifier and action buttons as in offline play

#### Scenario: No debug controls
- **WHEN** a player opens settings during an online game
- **THEN** there is no option to reveal other hands or to autoplay

### Requirement: Deploys do not destroy games
Restarting or redeploying the game server SHALL NOT lose running games: on shutdown the server SHALL stop starting new
games and persist what it needs, and on startup it SHALL resume unfinished games (see game-records). Connected clients
SHALL reconnect automatically.

#### Scenario: Redeploy mid-game
- **WHEN** the game server is restarted while games are running
- **THEN** after it comes back, players are reconnected to the same games in the same state (timers restart for the current decision)

