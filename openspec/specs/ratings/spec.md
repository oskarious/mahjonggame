# ratings Specification

## Purpose
TBD - created by archiving change add-game-server. Update Purpose after archive.
## Requirements
### Requirement: Every player has a rating
Each account SHALL have an Elo rating per format family (one shared rating for East-only and East+South in this
change), starting at 1000 and created on the player's first online game. The rating and number of rated games SHALL be
visible to the player on their account page and next to their name in online games.

#### Scenario: New player
- **WHEN** a player who has never played online finishes their first online game
- **THEN** their rating before that game was 1000 and it now reflects the result

#### Scenario: Rating visible
- **WHEN** a player opens their account page
- **THEN** it shows their rating and how many rated games they have played

### Requirement: Rating update from placements
After every completed online game, each seat's rating SHALL be updated from the final placements, bot players included,
treating the game as pairwise results against each other seat: finishing above a seat is a win, below is a loss, a tie
is a draw. Expected scores SHALL use the standard Elo formula with each opponent's rating at the start of the game. New
players (fewer than a threshold of rated games) SHALL move faster than established ones; the same applies to bot
players.

#### Scenario: Winning against stronger players
- **WHEN** a 1000-rated player finishes first against three 1200-rated opponents
- **THEN** their rating increases by more than it would for finishing first against three 1000-rated opponents

#### Scenario: Symmetric between established players
- **WHEN** a game has four established players, human or bot
- **THEN** the sum of their rating changes is zero (up to rounding)

#### Scenario: Tie
- **WHEN** two players tie on final points
- **THEN** that pair is scored as a draw

### Requirement: Abandoned seats still count
A game SHALL be rated for every human seated at the start, even if they disconnected and a bot finished for them.

#### Scenario: Leaver
- **WHEN** a player disconnects in the first hand and never returns
- **THEN** the game completes with a bot on their seat and the player's rating is updated from the final placement

### Requirement: Rating change shown after the game
The final results screen of an online game SHALL show every seat's rating change and new rating, bot players included.

#### Scenario: Results
- **WHEN** an online game ends
- **THEN** the standings show, for every seat, e.g. `+14 → 1014`

### Requirement: Hint level follows rating
In online games the server SHALL choose each player's hint level from their rating: more help at lower ratings, none at
higher ratings, using configurable thresholds. A player SHALL be able to choose a lower hint level than their rating
allows, but never a higher one. Hints above the chosen level SHALL never be sent to the client.

#### Scenario: New player gets hints
- **WHEN** a 1000-rated player plays online
- **THEN** they receive tenpai / waiting-tile hints

#### Scenario: Strong player gets none
- **WHEN** a player above the top threshold plays online
- **THEN** their views contain no hand hints at all

#### Scenario: Opting out
- **WHEN** a low-rated player turns hints off
- **THEN** their views contain no hand hints

### Requirement: Bot players are rated like players
Bot players SHALL have ratings that start at the calibrated Elo of their skill and change after every game they finish,
whether against humans or in background bot-only games, using the same rules as for humans.

#### Scenario: Game with bot players
- **WHEN** a player finishes a game against three bot players
- **THEN** all four ratings change, each computed against the others' ratings at the start of the game

#### Scenario: Bot-only game
- **WHEN** a background game of four bot players ends
- **THEN** their ratings change by the same rules and no human rating changes

