# Game server (apps/game-server)

Read when touching online play: rooms, timers, disconnects, matchmaking, bot players, ratings, recovery, the
admin API or the game server's DB access. Also read [fair-play.md](fair-play.md).

## Layout

```
apps/game-server/       @mahjong/game-server: Node 22 + ws, no build step (type stripping)
  src/main.ts           config → migration check → load bots → recover running games → top up bots → listen
  src/server.ts         http (/healthz, /internal → admin.ts) + upgrade (Origin, session via the web app); connection.ts
  src/hub.ts            users, queue ticks, rooms, message routing; room.ts: one game (serialized pipeline, timers)
  src/matchmaking.ts    per-format queues; rating.ts: Elo + hint level; store.ts: PgStore/MemoryStore; recovery.ts
  src/bots.ts           BotPool: bot players' live state, summoning, background games, admin operations
  src/settings.ts       runtime bot settings (defaults, validation; stored in `setting`); pacing.ts: bot think times;
                        names.ts: bot name generator
  src/db.ts             Kysely table types — a copy of apps/web/src/lib/server/schema.ts; keep them in sync
  test/                 vitest (fake timers); server.test.ts runs a real socket against a stub session endpoint
```

The DB schema is owned by apps/web (migrations there): `0002_game_server` = rating, game, game_seat, game_action
(written by this server); `0003_bot_players` = bot, setting, user.role. The server refuses to start until
`0003_bot_players` is applied.

## Rooms and timers

- **One serialized pipeline per room.** Every input (client action, timeout, bot move, ready, next hand) is queued
  (`Room.#run`) and processed as validate (seat, seq, legality via `actionKey`) → **persist** (`game_action` row,
  awaited) → `applyAction` → reschedule timers → send each connected human `viewFor` + `redactEvent`s (skipped
  for seats with no events and an unchanged view; see fair-play.md). Persist before send is what makes crashes safe;
  the tests plant that bug to check it stays.
- **Timers:** base 5 s (own turn) / 5 s (call), 10 s for the dealer's opening decision (`#baseMs`: dealer on turn,
  no dealer discard yet this hand), time bank 20 s reset every hand; deadline = base + bank, sent as remaining ms
  only to the deciding seat; expiry applies `timeoutAction`. A decision is identified by its step (`decisionKey`) so
  other seats' responses in a call window don't reset it. Bots (bot players and takeover bots) act after a
  human-like `thinkDelay` against the same base + bank (pacing.ts: quick when forced, longer with more options,
  ×1.8 on the opening, ~5 % long thinks into their own bank, never within 1 s of the deadline; × `thinkScale`; 0
  when fast-forwarding). All pacing numbers (think, join, ready) are runtime bot settings (`Pace` in pacing.ts). With `timeoutPercent` (0.5 %) a bot player at a table with a human times out instead (full
  base + bank, `timeoutAction`, bank emptied).
- **Countdowns:** after a deal the room *holds* (`#holdUntil`, room-level, not in the engine or the log): 5 s after a
  new game's first deal, 3 s after every later deal (`startCountdownMs` / `handCountdownMs`). While held no decision
  is scheduled (humans, bots, takeover bots), `act` is rejected, and updates carry `countdown` (ms left, every seat)
  and a view with `actions: []`; when it ends the room schedules and sends the dealer its actions + deadline.
  Recovered games get no start countdown; fast rooms none at all. The client shows it (Countdown.svelte).
  Before the start countdown a new game *joins* (held, no countdown sent): connected humans count as joined, each bot
  joins after its own `joinDelay` (median ~1.5 s), at most `joinMaxMs` (10 s), so the countdown doesn't always start
  at the human's arrival.
- **Between hands:** the next hand is dealt once every connected human *and every bot* has sent/drawn `ready`, or
  after 12 s (`readyMs`). Each bot confirms after its own `readyDelay` (median ~2.5 s, ~8 % slow up to 12 s,
  × `thinkScale`, 0 when fast), so the deal doesn't always follow the human's click (that timing would give the
  bots away). Bot-only rooms use the same rule; disconnected humans are not waited for.
- **Disconnects:** 10 s grace (timeouts keep running), then a bot at `skillForElo(rating)` plays the seat until the
  human reconnects; the newest connection of a user wins (`takenOver` to the old one). No human connected for 5 min →
  bots finish the game without delays; it is rated as normal.

## Matchmaking and bot players

- **Matchmaking** (in memory, lost on restart): per-format queue, 1 s tick, gap window `150 + 20/s` (cap 800).
  Only **full tables of 4** start, seeded from waiting humans (oldest first; humans before bots), so every table has a
  human; seats shuffled. There is no automatic fill: bot players join the queue instead (below).
- **Bot players** (bots.ts): `user` rows without an `account` (can't sign in; `<id>@bot.invalid`) + a `bot` row
  (hidden fixed `skill`, `active`). Clients can't tell them from humans (`PlayerInfo` has no bot flag). The pool
  (in memory, loaded at start) tracks idle / queued / busy + a 10–90 s rest; a bot is in at most one queue or game.
  - *Summoning*: a human waiting 3–9 s gets bots one at a time, 2–8 s apart; each is one of the 3 closest idle bots
    that fit the human's group (preferring bots that didn't just play them); a bot's window counts from its human's
    join time. Bots whose human left or was seated without them are withdrawn. No fit after 30 s → a bot is created
    at `skillForElo(rating)`.
  - *Background games*: every ~45 s (±50 %) 4 close idle bots play a normal room (persisted, rated, recovered) if
    `idleReserve` (30) idle bots remain. They pace, count down and confirm results like tables with humans.
    Rooms without humans skip the abandon fast-forward. *Warm-up* (fewer than
    half the bots have 20 games): fast rooms every 2 s, at most `warmupTables`.
  - Pool size: `botPoolMin` 120 active bots are created at start (ratings uniform over `botElo(0..1)`); `botPoolMax`
    caps active bots (growth, admin creation, reactivation); retired bots count for neither. All knobs are
    runtime settings (settings.ts, `setting` key `bots`), edited on `/admin`; env `BOTS=off` stops background games.
- **The `user` table contains bot players.** Anything that counts, lists or emails users must join `bot` (bot users
  have `@bot.invalid` emails). Admins: `UPDATE "user" SET role = 'admin' WHERE username = '…'` (no UI, by design).

## Ratings, auth, recovery, admin

- **Ratings:** pairwise Elo from final points (tie = draw), K 40 for the first 20 games then 20, **every seat with an
  account is rated** (bot players too; only the anonymous `userId: null` bots of pre-bot-player records are fixed at
  `botElo(skill)`), applied in one transaction with the result. Hint level: rating < 1300 → distance (waits are never gated),
  else off; a client can only lower it.
- **Auth:** the upgrade needs an allowed `Origin` (exact `ORIGIN`, or localhost/LAN in dev) and forwards the cookie
  to `{WEB_INTERNAL_URL}/api/auth/get-session`; the web app is the only thing that understands Better Auth cookies.
- **Recovery:** on start, `status = 'running'` games are replayed from `game_action` and rebuilt with all humans
  disconnected (grace runs); their bot players are marked busy. A game whose log no longer replays is marked
  `aborted` (unrated) instead of being retried every start. SIGTERM: stop matchmaking and bots,
  `server.restarting`, close sockets, exit — no draining.
- **Admin API** (admin.ts): `GET/POST /internal/bots`, `PATCH /internal/bots/:id` (name, skill, active),
  `PUT /internal/settings`; `Authorization: Bearer $INTERNAL_TOKEN` (disabled when unset). Only `/ws` is routed
  publicly. Retire, don't delete: retired bots keep their history and finish a running game first. Types live in
  `@mahjong/protocol` (`admin.ts`); the web side is `apps/web/src/lib/server/admin.ts`.

## Tests

Tests use `MemoryStore`, `FakeClient` and vitest fake timers (`TEST_CONFIG` has background games off; `addBots`,
`seeded`, `tickUntil` in test/helpers.ts; a 0 ms timeout set inside a fake tick fires 1 ms later); `room.idle()`
drains the queue including inputs that processing queued. Rigged states from the engine's `rig()` need `seq = 0`
after any pre-applied action (MemoryStore checks that seqs are contiguous).
