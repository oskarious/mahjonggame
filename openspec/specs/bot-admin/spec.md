# bot-admin Specification

## Purpose
TBD - created by archiving change bot-players. Update Purpose after archive.
## Requirements
### Requirement: Admin role
Every account SHALL have a role, `user` by default. The role SHALL only be changeable directly in the database: no
client request and no page can set it. Only accounts with the `admin` role SHALL be able to open the admin page or use
its actions.

#### Scenario: Regular user
- **WHEN** a signed-in user without the admin role opens `/admin`
- **THEN** they get a not-found page, the same as for a page that does not exist

#### Scenario: Signed out
- **WHEN** a signed-out visitor opens `/admin`
- **THEN** they get a not-found page

#### Scenario: Role cannot be self-assigned
- **WHEN** a user sends a role in a sign-up or profile update request
- **THEN** it is ignored and their role stays `user`

### Requirement: Live bot overview
The admin page SHALL show the bot pool as the game server currently sees it: the number of active bots, counts of idle,
queued and busy bots, whether bots were created on demand recently, and a sortable, filterable list of bots with name,
skill, rating, rated games, state and whether the bot is active. If the game server is unreachable, the page SHALL say so
instead of showing stale data.

#### Scenario: Busy bot shown
- **WHEN** a bot is seated in a running game
- **THEN** the admin list shows it as busy

#### Scenario: Game server down
- **WHEN** the admin opens the page while the game server is not running
- **THEN** the page shows that the game server is unreachable

### Requirement: Manage bots
An admin SHALL be able to create bots (a number of bots spread over a rating range, or one bot with a given name or
skill), rename a bot, change a bot's skill, retire a bot and reactivate a retired bot. Created bots follow the same rules
as seeded bots. Renaming SHALL enforce the same username rules and uniqueness as sign-up. Changing skill SHALL keep the
bot's rating. A retired bot SHALL never be summoned or seated again. A busy bot that is retired SHALL finish its current
game. Retired bots SHALL keep their account, rating and game history, and SHALL NOT count towards the minimum or maximum
pool size. Creating or reactivating bots SHALL be refused if it would take the number of active bots above the maximum.

#### Scenario: Create bots in a range
- **WHEN** an admin creates 10 bots between 1100 and 1250
- **THEN** 10 new active bots exist whose starting ratings lie in that range and match their skills' calibrated Elo

#### Scenario: Rename to a taken name
- **WHEN** an admin renames a bot to a username that already exists
- **THEN** the rename is rejected and the bot keeps its name

#### Scenario: Retire a busy bot
- **WHEN** an admin retires a bot that is in a game
- **THEN** the bot finishes that game, its rating is updated, and it is not used again

#### Scenario: Reactivate
- **WHEN** an admin reactivates a retired bot
- **THEN** it can be summoned and seated again with its previous rating and game count

#### Scenario: Maximum counts active bots
- **WHEN** the maximum is 3, there are 3 active bots and one of them is retired
- **THEN** one new bot can be created, and reactivating the retired one afterwards is refused

### Requirement: Runtime bot settings
An admin SHALL be able to view and change the bot settings at runtime: minimum and maximum pool size, idle reserve,
background game interval and on/off, warm-up interval and table cap, summon and arrival delays, on-demand growth delay,
rest after games, a think-time multiplier and the chance that a bot lets a decision time out. Each setting SHALL be
explained on the page. Changes SHALL take effect without restarting the game server, SHALL be
validated (for example no negative delays, and a minimum not above the maximum), and SHALL persist across restarts.

#### Scenario: Pause background games
- **WHEN** an admin turns background games off
- **THEN** no new bot-only games start, running ones finish normally, and summoning for humans continues

#### Scenario: Raise minimum pool
- **WHEN** an admin raises the minimum pool size above the number of active bots
- **THEN** the missing bots are created

#### Scenario: Invalid value
- **WHEN** an admin submits a minimum pool size above the maximum
- **THEN** the change is rejected with a message and the settings stay unchanged

#### Scenario: Survives restart
- **WHEN** the game server restarts after an admin changed a setting
- **THEN** the changed value is still in effect

### Requirement: Internal API is not public
The game server's bot management interface SHALL only accept requests carrying the shared internal token, and SHALL NOT
be reachable through the public site routing.

#### Scenario: Missing token
- **WHEN** a request to the internal API has no valid token
- **THEN** it is rejected and nothing changes

