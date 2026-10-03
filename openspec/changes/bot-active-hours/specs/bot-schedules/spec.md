## ADDED Requirements

### Requirement: Bot schedules
Every bot player SHALL have a schedule: a home time zone (an IANA zone, so daylight saving applies), a weekday
free-time window and a weekend free-time window in local time, and an appetite (average minutes of play per day).
Time zones SHALL be drawn from a configurable weighted region mix; windows and appetite SHALL vary between bots. A
schedule SHALL be fixed once created, stored with the bot, and SHALL survive restarts.

#### Scenario: New bot gets a schedule
- **WHEN** a bot player is created (pool top-up, on-demand growth or by an admin)
- **THEN** it is stored with a time zone from the region mix, a weekday and a weekend window, and an appetite

#### Scenario: Existing bot without a schedule
- **WHEN** the game server loads a bot player that has no stored schedule
- **THEN** it generates one and stores it, and the bot keeps that schedule on later starts

#### Scenario: Regions are spread
- **WHEN** many bots are created with the default region mix
- **THEN** their time zones cover several regions (e.g. Japan, Europe, the Americas) roughly in the configured
  proportions, and Japan has the largest share

### Requirement: Online sessions follow the local day
A bot player SHALL be either online or offline. An offline bot SHALL go online by starting a session; the chance of
starting a session at a given moment SHALL follow a daily curve in the bot's local time that is highest in the middle
of that day's free window, lower towards its edges, tails off for a while before and after the window, and is near zero
otherwise. Session lengths SHALL vary. Over a day the expected online time SHALL roughly match the bot's appetite, so a
bot is online for only part of its window, in one or more sessions with gaps between them.

#### Scenario: Evening player
- **WHEN** a bot's local weekday window is 18:00–24:00 and it is 21:00 there
- **THEN** it is more likely to be online than at 18:30 or 23:30, and much more likely than at 04:00 or 11:00

#### Scenario: Spill outside the window
- **WHEN** many days are simulated for a bot with window 18:00–24:00
- **THEN** some sessions start shortly before 18:00 or run past midnight, but almost none start in the middle of the
  local night or working day

#### Scenario: Not the whole window
- **WHEN** many days are simulated for a bot with a 6-hour window and an appetite of 90 minutes
- **THEN** its average online time per day is close to 90 minutes and it is not online for the whole window

#### Scenario: Different regions, different hours
- **WHEN** it is 12:00 UTC
- **THEN** bots in Japan with evening windows are more likely to be online than bots in Europe with evening windows

### Requirement: Only online bots play
Only online, idle, rested bot players SHALL be summoned for waiting humans or seated in background games. The idle
reserve for background games SHALL count online bots only. A session that ends while its bot is queued or in a game
SHALL let the bot finish that game; the bot goes offline afterwards instead of becoming idle.

#### Scenario: Offline bot not used for background games
- **WHEN** a background game is formed
- **THEN** none of its four bots is offline

#### Scenario: Session ends mid-game
- **WHEN** a bot's session ends while it is seated in a game
- **THEN** it plays the game to the end and then goes offline

### Requirement: Waiting humans are always served
Schedules SHALL NOT keep a human from getting a game. When a human has waited the summon time and no online bot fits
their rating window, the server SHALL bring an offline bot that fits online for a session (as if it logged on outside
its usual hours) before creating a new bot. A new bot SHALL be created only when no bot fits, online or offline.

#### Scenario: Night with no fitting online bot
- **WHEN** a human rated 1400 is waiting, no online idle bot fits, and an offline bot rated 1420 is idle
- **THEN** that bot goes online and is summoned for the human, and no new bot is created

### Requirement: Restart keeps a plausible population online
After a game server start, the set of online bots SHALL resemble the steady state for the current time (each bot online
with roughly the probability its schedule gives for that moment), not all online or all offline. Bots seated in
recovered games SHALL be online until those games end.

#### Scenario: Restart in the European evening
- **WHEN** the server starts at 20:00 Central European time
- **THEN** a share of the European evening bots is online right away, and few Japanese bots (03:00 there) are online

### Requirement: Warm-up ignores schedules
While the pool is warming up, warm-up games (without delays) SHALL be allowed to seat bots regardless of whether they are online, so
that ratings settle as before.

#### Scenario: Fresh pool at night
- **WHEN** the pool is new and most bots are offline
- **THEN** warm-up games still run at the configured rate

### Requirement: Schedule settings and admin view
The bot runtime settings SHALL include a switch for schedules (off = every bot always online, the previous behaviour),
the region weights, the appetite range and the session length range, validated like the other settings. The admin
bot list SHALL show each bot's time zone, current local time, window and online or offline state, and the pool counts
SHALL include how many bots are online and offline.

#### Scenario: Schedules switched off
- **WHEN** an admin turns schedules off
- **THEN** every active bot counts as online and may be summoned or seated at any hour

#### Scenario: Admin sees who is online
- **WHEN** an admin opens /admin
- **THEN** each bot shows its time zone, local time and whether it is online, and the counts show online and offline
  bots

### Requirement: Schedules leak nothing
Schedules and online state SHALL stay server-side: no client message SHALL carry a bot's schedule, time zone, online
state or any flag that tells bots from humans.

#### Scenario: Client view of a bot
- **WHEN** a bot player is seated at a table with a human
- **THEN** the human's client receives the same player information for it as for a human player
