## MODIFIED Requirements

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

### Requirement: Rating change shown after the game
The final results screen of an online game SHALL show every seat's rating change and new rating, bot players included.

#### Scenario: Results
- **WHEN** an online game ends
- **THEN** the standings show, for every seat, e.g. `+14 → 1014`

## REMOVED Requirements

### Requirement: Bots are fixed anchors
**Reason**: Bots are now persistent bot players whose ratings change with results, like humans'.
**Migration**: Bot players start at the calibrated `botElo(skill)` of their fixed skill; this anchors the pool once.
Disconnect-takeover bots are not seats of their own and are not rated; the human they play for is.

## ADDED Requirements

### Requirement: Bot players are rated like players
Bot players SHALL have ratings that start at the calibrated Elo of their skill and change after every game they finish,
whether against humans or in background bot-only games, using the same rules as for humans.

#### Scenario: Game with bot players
- **WHEN** a player finishes a game against three bot players
- **THEN** all four ratings change, each computed against the others' ratings at the start of the game

#### Scenario: Bot-only game
- **WHEN** a background game of four bot players ends
- **THEN** their ratings change by the same rules and no human rating changes
