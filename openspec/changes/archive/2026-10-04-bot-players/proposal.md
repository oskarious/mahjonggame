## Why

Online play feels empty. Today, if nobody else is queued, a player always gets three anonymous "Bot" seats with a 🤖
marker after exactly 15 s. Like .io games, the site should feel populated from day one. Opponents should look and
behave like real players (a name, a rating that moves, a game count) and turn up after a natural, varying wait. Bots
also need ratings that come from actual results, so a bot's number means the same thing as a human's.

## What Changes

- **Bot players**: a persistent population of bot profiles. Each has a username-style name, a hidden fixed skill, and a
  rating and game count that change like a human's. Bots are stored as accounts that cannot sign in, so ratings, game
  seats and any future profile or leaderboard treat them exactly like humans.
- **Background bot games**: on a slow timer, the game server seats idle bots of similar rating at bot-only tables. These
  are real games in ordinary rooms, played at human pace, recorded, rated and recovered like any other game. While a
  bot is in a game it is busy and cannot be matched.
- **BREAKING (matchmaking)**: the fixed "fill with anonymous bots after 15 s" is removed. When a human is waiting and no
  compatible humans are around, idle bot players near their rating **join the queue one by one** after randomized
  delays. They are matched by the normal rating-window logic, so the wait varies from game to game and a human can
  still be grouped with other humans who queue in the meantime. Summoned bots leave the queue again if the human
  leaves or is matched without them.
- **BREAKING (ratings)**: bots are no longer fixed anchors. Games are rated for every seat, bots included, with the same
  Elo rules. The pool is anchored once, when bots are created at their calibrated `botElo(skill)`.
- **BREAKING (online table)**: bot seats are no longer labelled. Seats show a name and rating only, and the protocol
  stops telling clients which seats are bots. Bot move timing in games with humans becomes human-like: it varies with
  the decision and sometimes uses the time bank, instead of a uniform 400–900 ms.
- Takeover bots for disconnected humans are unchanged (they play under the human's name).
- **Admin page** (`/admin`, only for users whose `role` is `admin`; roles are set directly in the database): shows the
  bot pool live (idle, queued, in a game), creates bots, renames them, changes their skill, retires and reactivates
  them, and edits the bot settings (pool size, idle reserve, background rate, summon and pacing delays) at runtime.
- The pool grows on demand: if no idle bot is anywhere near a waiting human's rating within a limit, a new bot
  profile is created at that rating.

## Capabilities

### New Capabilities
- `bot-players`: bot profiles (identity, hidden skill, rating, games, busy/idle state), creating and growing the pool,
  background bot-only games on a slow timer, human-like bot pacing, and bots being indistinguishable from humans to
  clients.

- `bot-admin`: the admin role, the admin page, bot management (create, rename, re-skill, retire/reactivate) and runtime
  bot settings.

### Modified Capabilities
<!-- These capabilities are introduced by the pending add-game-server change; archive it before this one. -->
- `matchmaking`: "Bot fill" is replaced by bot players joining the queue after randomized delays. Bot seats are no
  longer labelled. Bots never form a table without a human in the queue.
- `ratings`: "Bots are fixed anchors" is replaced by bots being rated like players. The results screen shows the
  rating change for every seat. Bot-only games are rated too.

## Impact

- **Game server**: new `bots.ts` (pool, summoning, starting background games). The `Matchmaker`
  gets queue entries for bots and no longer does automatic fill. `Room` gets bot-player seats, rates every seat and
  uses human-like bot delays. `store.ts` gets bot profile loading and creation. Rooms without humans skip the abandon rule. `config.ts` gets new knobs (pool size, background rate, summon delays). Recovery rebuilds bot-player
  seats.
- **Admin**: an internal HTTP API on the game server (`/internal/*`, bearer `INTERNAL_TOKEN`, not routed publicly), a
  `setting` table for runtime bot settings, `user.role` exposed through Better Auth `additionalFields`, and a new
  `/admin` route in the web app. New env var `INTERNAL_TOKEN` on both containers.
- **Protocol**: `PlayerInfo.bot` is removed; `PROTOCOL_VERSION` is bumped.
- **Web app**: new migration `0003_bot_players` (a `bot` table keyed by `user.id`, a `setting` table, `user.role`), schema types, and the 🤖 marker
  removed from `Board.svelte`. The game server's migration check requires `0003`. Offline play is unchanged: its bots
  keep the "Bot" names.
- **Engine**: no rules change. Bot skill ↔ Elo (`botElo`, `skillForElo`) is used to seed the pool and to create bots on
  demand.
- **Data**: bot users and their games live in the same tables as humans'. User counts and future leaderboards include bots unless filtered through the `bot`
  table.
