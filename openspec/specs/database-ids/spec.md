# database-ids Specification

## Purpose
TBD - created by archiving change uuid-ids. Update Purpose after archive.
## Requirements
### Requirement: Record ids are native UUIDs

Every id column SHALL be a Postgres `uuid`: the primary keys of `user`, `session`, `account`, `verification` and `game`, and every column that references one of them, SHALL have the Postgres type `uuid`. `daily_discard_vote.guestId` SHALL also be `uuid`. Values that are not ids
(`game.seed`, `daily_discard.date`, `setting.key`) SHALL stay as they are.

#### Scenario: Column types after migration

- **WHEN** all migrations have run
- **THEN** `information_schema.columns` reports `uuid` for `user.id`, `session.id`, `session.userId`, `account.id`,
  `account.userId`, `verification.id`, `game.id`, `game_seat.gameId`, `game_seat.userId`, `game_action.gameId`,
  `rating.userId`, `bot.userId`, `daily_discard_vote.userId` and `daily_discard_vote.guestId`
- **AND** `game.seed` is still `text`

#### Scenario: Malformed id rejected by the database

- **WHEN** something inserts a `game` row with id `not-a-uuid`
- **THEN** Postgres rejects the insert

### Requirement: New accounts get UUIDs

Better Auth SHALL be configured to use UUID ids. On Postgres, the database generates them (`gen_random_uuid()`
defaults on the auth tables' `id` columns). Bot players and games SHALL keep getting `crypto.randomUUID()` ids from the
game server.

#### Scenario: Sign-up

- **WHEN** a player signs up
- **THEN** their `user` row, their `account` row and their new `session` row each have a UUID id

#### Scenario: Bot creation

- **WHEN** an admin creates bot players
- **THEN** each bot's `user.id` (and `bot.userId`) is a UUID, as before

### Requirement: Existing accounts survive the migration

The migration SHALL give every existing `user` whose id is not a UUID a new random UUID. It SHALL rewrite every
reference to that id (sessions, accounts, ratings, game seats, bot rows, daily discard votes) in the same transaction,
so no account loses its password, rating, game history, votes or signed-in sessions. Ids that are already UUIDs
(bots) SHALL keep their value. If any step fails, the whole migration SHALL roll back and leave the old schema.

#### Scenario: Human account keeps its data

- **WHEN** a user with id `ZW246msai5rttzq9XFZtd6xQvyADWtUf`, a rating, finished games, a vote and an active session
  is migrated
- **THEN** they have a new UUID id, and their rating, `game_seat` rows, vote, `account` (password) and session all
  point to that UUID
- **AND** their credential account's `accountId` is that UUID, so they can still sign in with their password
- **AND** they stay signed in, and their next request resolves to the same username

#### Scenario: Bot keeps its id

- **WHEN** a bot player with id `9f1d65e6-02e3-4f56-a140-33e3b9dc2350` is migrated
- **THEN** its `user.id` is the same UUID

#### Scenario: Game ids are unchanged

- **WHEN** a game with id `109b066c-8093-4b99-84e8-1c948bc394a5` is migrated
- **THEN** the game, its seats and its action log keep that id

### Requirement: Outside ids are validated before queries

Ids that come from outside the server (HTTP paths, cookies, WebSocket messages) SHALL be checked to be UUIDs before
they are used in a query against a `uuid` column. A malformed id SHALL be handled like an unknown id, never as a
server error.

#### Scenario: Admin updates a bot with a malformed id

- **WHEN** the admin API receives `PATCH /internal/bots/abc`
- **THEN** it answers 404 "No such bot" and does not run a query that fails on the cast

#### Scenario: Tampered guest cookie

- **WHEN** a guest votes in the daily discard with a `riichi_voter` cookie of `x' or 1=1`
- **THEN** the cookie is treated as missing (a new guest id is issued when voting) and the request succeeds

#### Scenario: Pre-existing guest cookie

- **WHEN** a guest who voted before the migration, with a 32-hex-character `riichi_voter` cookie, opens the home page
- **THEN** their earlier vote is found and they see the results instead of a new ballot

#### Scenario: Malformed game id over WebSocket

- **WHEN** a client sends `{ type: 'ready', gameId: 'abc' }`
- **THEN** the protocol guard rejects the message as invalid

