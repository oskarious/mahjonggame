# matchmaking Specification

## Purpose
TBD - created by archiving change add-game-server. Update Purpose after archive.
## Requirements
### Requirement: Quick-play queue
A signed-in player SHALL be able to join a quick-play queue for one format: East-only or East+South, both with the
online default rules. The player SHALL be able to leave the queue at any time before a game starts. The queue screen
SHALL show that the player is waiting and how long they have waited, with minimal text.

#### Scenario: Join and leave
- **WHEN** a player joins the East-only queue and then cancels
- **THEN** they are removed from the queue and no game is started for them

#### Scenario: Format respected
- **WHEN** a player queues for East+South
- **THEN** any game they are placed in uses East+South with the online default rules

### Requirement: Rating-based grouping
The queue SHALL group players whose ratings are close. The acceptable rating gap SHALL widen the longer players wait,
so that nobody waits indefinitely because of their rating.

#### Scenario: Close ratings matched first
- **WHEN** players rated 1210, 1250, 1900 and 1230 are waiting in the same format
- **THEN** the 1210, 1230 and 1250 players are grouped before the 1900 player

#### Scenario: Gap widens
- **WHEN** a player has waited longer than the initial window without a close match
- **THEN** they become eligible to be grouped with players further from their rating

### Requirement: Bot fill
A game SHALL start with 4 seats taken from the queue. There SHALL be no fixed-time fill with anonymous bots. Instead,
when a human has waited a short randomized delay without a full table forming, idle bot players whose ratings fit the
human's current rating window SHALL join the queue one at a time, each after its own randomized delay. They are then
grouped by the normal rating-based grouping, so a human who queues in the meantime can take a seat instead. Bot players
in the queue SHALL only be grouped into a table that contains at least one human. Bot players SHALL leave the queue when
the human they joined for leaves the queue or is seated without them. A single player SHALL still always get a game.
Bot seats SHALL NOT be marked as bots.

#### Scenario: Solo player
- **WHEN** one player is queued and no other human joins
- **THEN** three bot players near their rating join the queue at different moments and a game starts with them

#### Scenario: Wait varies
- **WHEN** a solo player queues several times
- **THEN** the time until their game starts is not the same every time

#### Scenario: Human preferred while waiting
- **WHEN** a player is waiting, one bot player has joined for them, and a compatible human then queues
- **THEN** the human can be grouped into that table in place of bots still to come

#### Scenario: Two players
- **WHEN** two players with close ratings are waiting and no one else joins
- **THEN** they are seated in the same game with two bot players

#### Scenario: Full table without waiting
- **WHEN** four compatible players are queued
- **THEN** a game starts immediately with no bot players

#### Scenario: Summoned bots withdraw
- **WHEN** a player leaves the queue after bot players have joined for them
- **THEN** those bot players leave the queue and no game is started with only bots

#### Scenario: Bots are not labelled
- **WHEN** a game contains bot players
- **THEN** their seats show a name and rating like any human's, with no bot marker

### Requirement: Random seating
Seat order (and therefore the initial dealer) SHALL be random for every game, including the positions of bots.

#### Scenario: Seating is not queue order
- **WHEN** many games are started from the queue
- **THEN** the first player to queue is not systematically placed on the same seat

