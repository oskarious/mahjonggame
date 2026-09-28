## ADDED Requirements

### Requirement: Bot player profiles
The system SHALL keep a persistent population of bot players. Each bot player SHALL have a unique username-style
display name, a hidden fixed skill level, and a rating and rated-game count stored and updated exactly like a human
account's. A bot player SHALL NOT be able to sign in. Bot names SHALL share the namespace of human usernames, so a human
cannot register a name a bot already uses and the other way round.

#### Scenario: Bot has a profile
- **WHEN** a bot player is seated in an online game
- **THEN** the seat shows its own name and its current rating, and the same name and rating are shown in its next game

#### Scenario: No sign-in
- **WHEN** someone tries to sign in with a bot player's username
- **THEN** sign-in fails like it does for an unknown account

#### Scenario: Name taken
- **WHEN** a human tries to register the username of an existing bot player
- **THEN** registration is rejected as for any taken username

### Requirement: Pool seeding and growth
On startup, and whenever the setting changes, the game server SHALL make sure a configured minimum number of active
bot players exists. Missing bots SHALL be
created with skills spread over the bot skill range and a starting rating equal to the calibrated Elo for their skill.
When a waiting human cannot be served by any idle bot within the widest rating window, the server SHALL create a new bot
player whose calibrated Elo is closest to that human's rating, up to a configured maximum number of active bots.
Retired bots count towards neither the minimum nor the maximum.

#### Scenario: Empty database
- **WHEN** the game server starts against a database with no bot players
- **THEN** it creates the minimum number of bot players, and their starting ratings equal their skills' calibrated Elo

#### Scenario: Pool exhausted near a rating
- **WHEN** a human rated 1150 is waiting and every bot within the widest window is busy
- **THEN** a new bot player is created near 1150 and can be summoned for that human

### Requirement: Busy and idle bots
A bot player SHALL be in at most one game or queue at a time. A bot player seated in a game (with or without humans)
SHALL be busy until that game ends. For a background game, "ends" means the time the game would have taken at human
pace. Only idle bot players SHALL be summoned to the queue or seated in background games.

#### Scenario: Busy bot not reused
- **WHEN** a bot player is seated in a game that has not ended
- **THEN** it is not summoned for another player and not seated in a background game

### Requirement: Background bot games
On a slow, configurable timer the game server SHALL start games made only of idle bot players with close ratings,
using the online default rules and a random format, but only while a configured reserve of idle bots remains free for
humans. Background games SHALL be real online games: played at human pace,
recorded, rated with the normal rating rules, and resumed after a restart like any other game. A game without human
seats SHALL NOT be fast-forwarded by the abandon rule. While the bot pool is new (most bots have fewer rated games than
the new-player threshold), background games MAY run without move delays so that ratings settle quickly.

#### Scenario: Ratings drift
- **WHEN** background games run for a while
- **THEN** bot players' ratings and game counts change, and their ratings move towards the strength of their skill

#### Scenario: Close ratings
- **WHEN** a background game is formed and enough idle bots are available
- **THEN** all four bots are within the base rating window of each other

#### Scenario: Humans come first
- **WHEN** starting a background game would leave fewer idle bots than the idle reserve
- **THEN** no background game starts

#### Scenario: Takes real time
- **WHEN** a background game starts after warm-up
- **THEN** it lasts about as long as a game between humans, and its bots are busy for all of it

#### Scenario: Restart mid-game
- **WHEN** the server restarts while a background game is running
- **THEN** the game is resumed from its stored actions and finishes normally

### Requirement: Indistinguishable from humans
Clients SHALL NOT be told whether a seat is a bot player. Seat information for bot players SHALL have the same shape and
content as for humans (name and rating). In games with humans, bot players SHALL act after human-like delays: shorter
for obvious decisions, longer for harder ones, and occasionally dipping into their time bank. With a small configurable
chance per decision a bot player SHALL let its timer run out like a distracted human: it waits the full time, the
automatic timeout move is played and its time bank is used up for the hand. Timeouts SHALL only happen in games with
humans.

#### Scenario: Same seat info
- **WHEN** a client receives the players of a game with humans and bot players
- **THEN** nothing in the seat information distinguishes a bot player from a human

#### Scenario: Varied pace
- **WHEN** a bot player makes many decisions in a game
- **THEN** its response times vary, and some exceed the base turn time

#### Scenario: Occasional timeout
- **WHEN** a bot player at a table with a human times out on its turn
- **THEN** its move is played only when base time plus bank have run out, it is the automatic timeout move, and the
  bot's bank is empty for the rest of the hand

#### Scenario: No timeouts without humans
- **WHEN** a background game of four bot players runs
- **THEN** no bot lets its timer run out

### Requirement: Offline bots unchanged
Offline play in the browser SHALL keep its unnamed skill-based bots. Bot players exist only in online play.

#### Scenario: Offline game
- **WHEN** a guest starts an offline game
- **THEN** the opponents are the local bots as before, not bot players
