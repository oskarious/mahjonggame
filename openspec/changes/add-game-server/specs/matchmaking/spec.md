## ADDED Requirements

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
A game SHALL start with 4 seats. If fewer than 4 compatible humans are available after a fill delay, the remaining
seats SHALL be filled with bots whose strength matches the humans (the average rating of the humans in that game,
mapped to a bot skill via the calibration table). A single player SHALL be able to get a game this way. Bots SHALL be
clearly marked as bots in the table.

#### Scenario: Solo player
- **WHEN** one player is queued and no one else joins within the fill delay
- **THEN** a game starts with that player and three bots of matching strength

#### Scenario: Two players
- **WHEN** two players with close ratings are waiting when the fill delay ends
- **THEN** they are seated in the same game with two bots

#### Scenario: Full table without waiting
- **WHEN** four compatible players are queued
- **THEN** a game starts immediately with no bots

#### Scenario: Bots are labelled
- **WHEN** a game contains bots
- **THEN** their seats are shown with a bot marker and their rating

### Requirement: Random seating
Seat order (and therefore the initial dealer) SHALL be random for every game, including the positions of bots.

#### Scenario: Seating is not queue order
- **WHEN** many games are started from the queue
- **THEN** the first player to queue is not systematically placed on the same seat
