## ADDED Requirements

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
After every completed online game, each human player's rating SHALL be updated from the final placements, treating the
game as pairwise results against each other seat: finishing above a seat is a win, below is a loss, a tie is a draw.
Expected scores SHALL use the standard Elo formula with each opponent's rating at the start of the game. New players
(fewer than a threshold of rated games) SHALL move faster than established ones.

#### Scenario: Winning against stronger players
- **WHEN** a 1000-rated player finishes first against three 1200-rated opponents
- **THEN** their rating increases by more than it would for finishing first against three 1000-rated opponents

#### Scenario: Symmetric between humans
- **WHEN** a game has four established humans and no bots
- **THEN** the sum of their rating changes is zero (up to rounding)

#### Scenario: Tie
- **WHEN** two players tie on final points
- **THEN** that pair is scored as a draw

### Requirement: Bots are fixed anchors
Bots SHALL have a fixed rating derived from their skill level and the calibration table. Bots' ratings SHALL NOT change,
and games against bots SHALL be rated for the human players using the bots' ratings.

#### Scenario: Game with bots
- **WHEN** a player finishes a game against three bots
- **THEN** only the player's rating changes, computed against the bots' fixed ratings

### Requirement: Abandoned seats still count
A game SHALL be rated for every human seated at the start, even if they disconnected and a bot finished for them.

#### Scenario: Leaver
- **WHEN** a player disconnects in the first hand and never returns
- **THEN** the game completes with a bot on their seat and the player's rating is updated from the final placement

### Requirement: Rating change shown after the game
The final results screen of an online game SHALL show each human player's rating change and new rating.

#### Scenario: Results
- **WHEN** an online game ends
- **THEN** the standings show, for the player, e.g. `+14 → 1014`

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
