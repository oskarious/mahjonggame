## Context

The game server (`apps/game-server`, change `add-game-server`) runs quick-play with an in-memory `Matchmaker`. Its
`tick()` starts a table as soon as 4 compatible players are queued. Otherwise, once the oldest waiter has waited
`fillDelayMs` (15 s), it fills the missing seats with anonymous bots at `skillForElo(mean rating)`. Those bots are
`{ kind: 'bot', skill }` seats: shown as "Bot" with a 🤖 marker (`PlayerInfo.bot`), rated at a fixed `botElo(skill)`,
stored as `game_seat.userId = null, botSkill = skill`, and moving after a uniform 400–900 ms. `ratingChanges()`
returns 0 for them.

With few humans online, almost every game is "you + 3 labelled bots after exactly 15 s", which makes the site feel
empty. The goal, as in .io games, is opponents that look like a living player base.

Constraints: one game-server instance holds all live state; the engine is pure and synchronous (`applyAction`,
`botAction`); persistence goes through the `Store` interface (`PgStore` / `MemoryStore` in tests); migrations are
owned and run by the web app, and the game server only checks that they are applied; Better Auth owns
`user`/`account`/`session`.

## Goals / Non-Goals

**Goals:**
- An admin page to see the bot pool live, add, rename, re-skill and retire bots, and tune the bot settings at runtime.
- Persistent bot players with names, hidden skill, and a rating and game count that evolve by the normal Elo rules.
- Bot players keep playing each other in the background at a slow rate, so ratings and game counts stay alive.
- Waiting humans are served by bot players who "join the queue" at natural, varying times. The fixed 15 s fill is gone.
- Clients cannot tell bot players from humans: same seat info, human-like pacing.
- Simple, testable, and no measurable impact on live games.

**Non-Goals:**
- Role management UI (admins are set in the database), public profile pages, leaderboards, game history UI, an online-player count (the design only keeps them possible).
- Fake chat, fake friend activity, or bots that disconnect/reconnect.
- Making bots stronger. Skill is still `botProfile(skill)`, and the rating ceiling (~1309) is unchanged.
- Changes to offline play.

## Decisions

### D1. Bot players are `user` rows plus a `bot` table
New migration `0003_bot_players` adds `bot(userId text PK → user.id ON DELETE CASCADE, skill real NOT NULL, active
boolean NOT NULL DEFAULT true, createdAt timestamptz)`, plus the `setting` table (D7) and `user.role` (D8). A bot player is a normal `user` row: `name`/`displayUsername` = the generated name, `username` =
lowercased name, `email = <id>@bot.invalid`, `emailVerified = false`, and **no `account` row**. Without a credential
account, Better Auth sign-in fails like it does for an unknown user. Its rating lives in the existing `rating` table, and
its seats use `game_seat.userId` like a human's. `game_seat.botSkill` is also set on bot seats; this internal marker
keeps records analysable and makes recovery simple.

*Why:* ratings, game seats, recovery, and future leaderboards and profiles work unchanged for both kinds of player, and
username uniqueness is enforced by the existing unique index.
*Alternative:* a separate `bot_player` table with its own rating columns. Rejected: every rating/record query would need
a UNION, and `rating`/`game_seat` foreign keys point at `user`.

The game server creates bot users itself (it already writes `rating`, `game`, `game_seat`). Its migration check now
requires `0003`.

### D2. Seat model
`SeatInit` becomes:
- `{ kind: 'human', userId, name, rating, games }` (unchanged)
- `{ kind: 'bot', userId, name, rating, games, skill }` — a bot player
- `{ kind: 'bot', userId: null, skill }` — a legacy anonymous bot, only for recovering games started before this change

`Room` rates every seat that has a `userId`. Legacy anonymous bots keep their fixed `botElo(skill)` and are not
updated. `ratingChanges()` gets a `fixed` flag in place of `bot`. `PlayerInfo` loses `bot` (protocol version bump), and
the 🤖 marker is removed from `Board.svelte`. `game.end.ratings` now lists every rated seat. The results screen already
renders per-seat changes, so it only needs to stop assuming "humans only".

### D3. `BotPool` owns bot state (new `bots.ts`)
In memory, loaded from the store at startup (`loadBots()`): `id, name, skill, rating, games, state` where state is
`idle | queued(forUserId) | busy(until | roomId)`, plus `restUntil` and `recentOpponents`. It is the only thing that
changes bot state. After `hub.recover()`, bots seated in recovered rooms are marked busy. When a room ends
(`Hub.#onEnd`), its bots get their new rating and games, and become idle after a random rest of 10–90 s. The rest stops
the same bot from reappearing instantly, and it avoids summoning a bot for a human it has just played with.

Seeding: at startup `ensurePool(botPoolMin)` creates the missing bots. Their ratings are drawn uniformly over
`[botElo(0), botElo(1)]` and mapped back with `skillForElo`, so the rating range is covered evenly. Starting rating =
`round(botElo(skill))`, games = 0.

Names (`names.ts`): a small curated generator (word+word, word+digits, lowercase handles, occasional `_`), 3–20
chars, valid Better Auth usernames. Inserts use `ON CONFLICT DO NOTHING` and retry with a new name, so a name taken by a
human is simply skipped. The word lists are curated to avoid offensive combinations.

### D4. Summoning replaces fill
`Matchmaker` changes:
- `QueueEntry` gets `bot?: { forUserId }`. Only human entries seed groups (`oldest` = oldest human), so every table
  contains a human.
- **No fill.** `tick()` only starts complete groups of 4. `fillDelayMs` is removed.
- A bot entry uses its summoner's `joinedAt` for its window, so it is exactly as flexible as the human it came for.
  Otherwise a freshly joined bot would have the narrow base window and stall the table.

`BotPool.tick(now)` runs in `Hub.tick()` after the matchmaker. For each queued human:
1. At join, draw `summonAt = joinedAt + U(summonAfterMs)` (default 3–9 s). Before that, nothing happens, so humans who
   queue together get matched with each other first.
2. After `summonAt`, if the group the matchmaker would form for this human (humans + already-queued bots) has fewer
   than 4, and no arrival is scheduled, schedule one arrival at `now + U(botArrivalMs)` (default 2–8 s). Arrivals are
   one at a time, so a solo player sees the table fill in roughly 9–35 s, different every time.
3. On arrival, pick an idle, rested bot whose rating fits the human's current window and every other group member's.
   Choose randomly among the 3 closest, prefer bots not in `recentOpponents`, and queue it for this human.
4. If no idle bot fits and the human has waited `growAfterMs` (30 s) with the window at max, create a bot at
   `skillForElo(humanRating)`. If `botPoolMax` active bots exist, summon the nearest idle bot regardless of window. A player
   always gets a game.

Withdrawal: each tick, bot entries whose summoner is no longer queued (left, or seated in a table without them) leave
the queue and return to idle, with no rest. A bot seated in a table becomes busy with that room.

*Alternative:* bots idling in the queue all the time ("ambient" bots). Rejected: bot-only groups would form in the
queue, there would be two paths to bot-only games, and "is the queue empty?" would lose its meaning. Summoning on
demand keeps the queue about humans.

### D5. Background games are real Rooms
Every `backgroundEveryMs` (default 45 s, ±50 % jitter), if at least `idleReserve` idle bots would remain (D7),
`BotPool` picks a random idle, rested bot and its 3 closest idle peers (widening from `windowBase` if
needed) and starts a game through the same `Hub.startGame(match)` path as queue matches, with a random format. The game
is an ordinary `Room`:
- Actions are persisted (`game_action`), the game is recorded and rated by `Room.#finish`, and it is resumed after a
  restart by the normal recovery. There is no second code path for bot-only games.
- Bots move with the human-like `thinkDelay` (D6), so a bot-only game takes as long as a real one (about 12–25 min for
  East-only). Bots are busy for exactly that time, and a future "live games" count or spectating sees real games.
- `Room` changes: the abandon rule ("no human connected for 5 min → fast-forward") applies only to rooms that have
  human seats, and between hands a room without humans waits a short random pause instead of `readyMs`.
- Cost: at ~12 concurrent bot tables, about 10k `game_action` rows an hour. That is fine for Postgres. If it ever
  matters, action logs of old bot-only games can be pruned (the game, seats and result stay).

Warm-up: while fewer than half the bots have `newGames` rated games (for example on first deploy), background rooms start
in fast mode (no bot delays, as abandoned games already do), the interval drops to `warmupEveryMs` (2 s). This produces plausible game counts and settled ratings within hours, without a separate
script. Fast rooms still yield between pipeline steps (every action is an awaited DB write), so live rooms are not
starved; the number of concurrent warm-up rooms is capped by `warmupTables` (default 8).

*Alternative:* simulate bot-only games in a tight loop and write only the result, keeping bots "busy" for a virtual
duration. Rejected: a second game path to maintain, a fake busy period, and no recovery or live visibility. The only
gain was fewer stored rows.

### D6. Human-like pacing in Room
`Room`'s bot delay (bot players **and** disconnect-takeover bots, which play under a human's name) comes from
`thinkDelay(state, seat, action, random)` in `bots.ts`:
- Single legal action (forced discard in riichi, only "pass"): 300–800 ms.
- Call window with an option: 0.8–2.5 s.
- Discard: log-normal around 1.5 s, scaled up with the number of distinct candidate discards and for riichi/kan
  decisions.
- With about 5 % probability, a long think of up to `turnMs + 0.6 × remaining bank`. The bank is charged like a
  human's, and the delay is always capped below the deadline.
- All delays are multiplied by the `thinkScale` setting (D7). `#fast` (abandoned game, warm-up) stays 0.
- With `timeoutPercent` chance per decision (default 0.5 %), a bot player at a table with a human times out instead:
  the room schedules the normal timeout at base + bank, plays `timeoutAction` and empties the bot's bank, exactly as for
  a human. Three bots make about 180 decisions per game, so the default gives about one timeout per game. Not in games
  without humans (nobody to convince, and it would only slow background games) and not for takeover bots (the absent
  human would pay for it).

Because timing is only visible through when events arrive, and deadlines are only ever sent to the deciding seat, this
is enough to hide which seats are bots. `botDelayMs` is removed.

### D7. Pool size and settings
**How many bots.** The pool has to cover three needs at once:
- *Human tables*: a solo player takes 3 bots for a whole game (~15–25 min) plus rest. `S` concurrent solo players tie
  up about `3S` bots.
- *Rating coverage*: an arriving human should find several idle bots within the base window (±150) anywhere in the
  bot range (~960–1310). With ratings spread evenly, about 30 idle bots gives at least 8–10 candidates at any rating,
  so summoned tables are close in rating and not the same faces every time.
- *Background tables*: enough bot-only games to keep ratings and game counts moving, but never at humans' expense.

Background games therefore use an **idle reserve** instead of a busy share: a background table starts only if at least
`idleReserve` (default 30) idle bots remain after taking its 4. Human demand automatically pushes background games out:
when players arrive, bots finish their background games and stop starting new ones.

With **120 bots** (the default `botPoolMin`), about 20 bot tables run while nobody is online. About 15 concurrent solo
players (or many more in mixed tables) are served before the pool starts growing on demand. That is plenty for launch.
With more players, fewer bots are needed per human, because humans fill each other's tables. Raise `botPoolMin` from
the admin page if bots are being created on demand regularly.

**Settings are runtime data, not env.** A `setting` table (`key text PK, value jsonb, updatedAt`) holds the bot knobs:
`botPoolMin`, `botPoolMax`, `idleReserve`, `backgroundEveryMs`, `backgroundEnabled`, `warmupEveryMs`, `warmupTables`,
`summonAfterMs`, `botArrivalMs`, `growAfterMs`, `botRestMs`, a `thinkScale` multiplier and `timeoutPercent` for D6. Both
`botPoolMin` and `botPoolMax` count active bots only (retired bots are ignored), so they can't contradict each other. The game
server loads them at startup over the code defaults. It is the only writer (D9), so changes apply immediately without
polling. The env var `BOTS=off` still disables background games (tests, local debugging). Summoning is always on,
because a player must always get a game. Timers, rating K and hint thresholds stay in env/config, as today.

### D8. Admin role
Migration `0003` also adds `user.role text NOT NULL DEFAULT 'user'`. It is declared in Better Auth's
`user.additionalFields` with `input: false`, so clients can't set it and it arrives on `locals.user`. Admins are made
by hand in the database (`UPDATE "user" SET role = 'admin' WHERE username = '…'`); there is no UI for roles.
*Alternative:* Better Auth's admin plugin. Rejected for now: it brings bans, impersonation and extra session columns we
don't need. A plain `role` column is compatible with switching later.

### D9. Admin page and game-server internal API
The live bot state (idle/queued/busy, current room) lives in game-server memory, so the admin page talks to the game
server instead of the database:
- The game server gets an HTTP API under `/internal/` on its existing server: `GET /internal/bots` (pool with live
  state, settings, counts by state, whether bots were created on demand recently), `POST /internal/bots` (create N
  bots in a rating range, or one with a given name/skill), `PATCH /internal/bots/:id` (rename, set skill, retire or
  reactivate), and `PUT /internal/settings`. Every request needs `Authorization: Bearer $INTERNAL_TOKEN` (a new env
  var shared by both containers). In production only `/ws` is routed to the game server, so `/internal` isn't reachable
  from outside anyway; the token is defence in depth.
- The web app gets `/admin` (plain, functional, desktop-friendly). Its `+layout.server.ts` returns 404 unless
  `locals.user.role === 'admin'`. Server `load`s and form actions call the game server at `GAME_SERVER_URL`. If the game
  server is down, the page says so.
- **Retire, don't delete.** Retiring sets `bot.active = false`: a retired bot is never summoned or seated again, and a
  busy bot finishes its current game first. Its user, rating and game history stay, so past games keep their
  opponent's name. Retired bots can be reactivated. Hard deletion is left to the database (it would null the bot's
  past seats like a deleted account). `botPoolMin` counts active bots only.
- **Rename** checks username validity and uniqueness like sign-up does. **Changing skill** keeps the rating, which then
  moves towards the new strength through normal play.
- The page shows the pool size and counts per state, a table of bots (name, skill, rating, games, state, active) with
  sort and filter, the create/rename/skill/retire actions, and the settings form.

*Alternative:* the web app writes bots and settings to the database and the game server polls them. Rejected: two
writers of bot state, polling latency, and the admin page still couldn't show live state.

## Risks / Trade-offs

- [Players may feel deceived if they find out opponents are bots] → This is a product decision the owner has made (.io
  style). A neutral line on an about/FAQ page ("opponents may include AI players") is cheap and does not break
  immersion at the table. See Open Questions.
- [Bot pool ratings drift from the engine calibration over time] → Bot-only games are zero-sum among established
  players, and every bot starts at its calibrated Elo, so the pool stays anchored. Human-vs-bot games move points
  between the pools as intended. Monitor the pool mean and re-anchor with a constant shift if needed (the same tool as
  the bot anchor today).
- [High-rated humans (> ~1350) rarely find bots near them, and bots can't be stronger] → The window widens to 800 and
  growth creates bots at the top skill. Games stay possible; their quality at the top is an existing limitation.
- [Load from bot-only rooms] → A room is idle between timed moves, so a dozen extra rooms cost little. Warm-up rooms in
  fast mode are capped by `warmupTables`. The idle reserve bounds steady-state load.
- [Bot rating read at seat time and written at game end, like humans] → Safe because a bot is in at most one game or
  queue at a time (the pool enforces it). This invariant gets tests.
- [Restart loses in-memory bot state (rest, busy-until, queued)] → Bots in recovered rooms are marked busy again, and
  everything else starts idle. Bot-only rooms are recovered like any other game.
- [User table now contains non-humans] → Anything counting or emailing users must join against `bot`. This is noted in
  AGENTS.md. There is no email feature today.
- [Username squatting: bots take nice names] → Names are generated in handle-like patterns from a curated list, and
  the pool is small (about 120 at first).

## Migration Plan

1. Deploy the web app with migration `0003_bot_players`: additive, runs on web start. Deploy the game server in the
   same compose update. The game server refuses to start without `0003`, and on start it seeds the pool and enters
   warm-up. Set `INTERNAL_TOKEN` (≥ 32 random chars) on the compose app first. After the deploy, make yourself admin
   with an `UPDATE "user" SET role = 'admin' ...` in the database.
2. Protocol version bump: old clients get the existing version-mismatch path and reload.
3. Running games from before the deploy recover with legacy anonymous bot seats (D2) and finish as before.
4. Rollback: redeploy the previous game server. Bot users and their `bot` rows stay but are unused; seats they hold in
   running games replay as `userId` humans that never connect, and are finished by bots after the abandon period. For
   a clean rollback, delete the bot users: `DELETE FROM "user" WHERE id IN (SELECT "userId" FROM bot)` cascades to
   ratings and nulls their seats.

## Open Questions

- Disclosure: add an "opponents may include AI players" line to an about/FAQ page? (Recommended; no UI in this change.)
- Should future leaderboards include bot players? Including them keeps the illusion. Excluding them (via the `bot`
  table) keeps the rankings honest. The data model supports both.
- Should bots also queue for East+South in background games in the same proportion as humans choose it? This starts at
  50/50 and can later follow the observed human split.
