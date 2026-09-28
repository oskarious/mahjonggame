## 1. Data model

- [x] 1.1 Add migration `apps/web/migrations/0003_bot_players.ts`: `bot(userId PK → user.id cascade, skill real not null, active boolean default true, createdAt)`, `setting(key PK, value jsonb, updatedAt)`, `user.role text not null default 'user'`; add `BotTable`, `SettingTable` and `role` to `apps/web/src/lib/server/schema.ts` and the game server's `db.ts` types
- [x] 1.2 Make the game server's `checkMigration` require `0003_bot_players`
- [x] 1.3 Extend `Store` with `loadBots()`, `loadSettings()`, `saveSettings()`, `updateBot()`, `createBot({ name, skill, rating })` (user row with `<id>@bot.invalid`, no account; `rating` row; `bot` row in one transaction; returns null on username conflict); implement in `PgStore` and `MemoryStore`
- [x] 1.4 Store bot-player seats with `userId` and `botSkill`; `loadRunningGames` returns `{ kind: 'bot', userId, name, rating, games, skill }` when `botSkill` is set with a user, and legacy `{ kind: 'bot', userId: null, skill }` otherwise

## 2. Ratings and seats

- [x] 2.1 Update `SeatInit` / `RoomSeat` for bot players and legacy anonymous bots (design D2)
- [x] 2.2 Replace `RatedSeat.bot` with `fixed`; rate every seat with a `userId` (bot players use their own rating and games for K); update `rating.test.ts` (symmetry with bots, fixed legacy bots)
- [x] 2.3 `Room.#finish`: produce `RatingUpdate`s and `RatingChange`s for every rated seat; `Hub.#onEnd` passes bot updates to the pool

## 3. Protocol and web

- [x] 3.1 Remove `PlayerInfo.bot`, bump `PROTOCOL_VERSION`, update guards/tests
- [x] 3.2 `Room.info` sends name and rating for bot players exactly like humans (legacy bots keep "Bot" and their fixed rating)
- [x] 3.3 Remove the 🤖 marker from `Board.svelte`; make the online results screen show rating changes for every seat that has one

## 4. Bot pool

- [x] 4.1 `names.ts`: curated handle generator (valid Better Auth usernames, 3–20 chars), seeded random; unit test for validity and variety
- [x] 4.2 `bots.ts` `BotPool`: load from store, states idle/queued/busy, rest after games, recent opponents; `ensurePool(min)` seeding uniformly in Elo over `[botElo(0), botElo(1)]`, retrying on name conflicts
- [x] 4.3 Mark bots in recovered rooms busy after `hub.recover()`; free bots and apply ratings when rooms end
- [x] 4.4 Bot settings with code defaults (`botPoolMin` 120, `botPoolMax`, `idleReserve` 30, `backgroundEveryMs`, `backgroundEnabled`, `warmupEveryMs`, `warmupTables`, `summonAfterMs`, `botArrivalMs`, `growAfterMs`, `botRestMs`, `thinkScale`); env `BOTS=off` and `INTERNAL_TOKEN`; remove `fillDelayMs`/`FILL_DELAY_MS` and `botDelayMs`; update `.env.example` files

## 5. Matchmaking with summoned bots

- [x] 5.1 `Matchmaker`: bot queue entries (`bot.forUserId`, window from the summoner's `joinedAt`), only humans seed groups, no fill (start only full groups); expose `groupFor(userId)` for the pool
- [x] 5.2 `BotPool.tick`: per human draw `summonAt`, schedule one arrival at a time, pick among the 3 closest fitting idle bots (avoid recent opponents), grow the pool after `growAfterMs`, fall back to the nearest idle bot at `botPoolMax`
- [x] 5.3 Withdraw bot entries whose summoner left or was seated without them; mark seated bots busy with their room
- [x] 5.4 Wire into `Hub.tick()`, `Hub` construction and `main.ts` (load pool, ensure pool, recover, then start ticking)
- [x] 5.5 Tests (fake timers, seeded random): solo player gets 3 bot players at staggered times; wait varies across seeds; two humans + 2 bots; 4 humans start with no bots; a human who queues mid-wait is seated instead of a later bot; leaving the queue withdraws bots and starts no game; busy bots are never summoned; pool grows when exhausted

## 6. Background games

- [x] 6.1 `Room`: apply the abandon rule only to rooms with human seats; rooms without humans pause a short random time between hands instead of waiting `readyMs`
- [x] 6.2 Scheduler in `BotPool`: interval with jitter, idle-reserve check, table of 4 closest idle bots, random format; start through `Hub.startGame`; bots busy until the room ends
- [x] 6.3 Warm-up mode: short interval, fast rooms (no delays), at most `warmupTables` concurrent
- [x] 6.4 Tests: a background room plays to the end and rates all 4 bots (zero-sum for established bots); it is not fast-forwarded by the abandon rule; its bots are never summoned while it runs; it recovers after a restart; warm-up rooms respect the cap; no background game starts below the idle reserve

## 7. Human-like pacing

- [x] 7.1 `thinkDelay(state, seat, action, random)`: forced / call / discard / riichi-kan buckets, rare long thinks capped below the deadline, bank charged, scaled by `thinkScale`
- [x] 7.2 Use it in `Room` for bot players and takeover bots (0 when fast-forwarding); update `room.test.ts` timing assumptions
- [x] 7.3 Test: over many decisions the delays vary, some exceed `turnMs`, none reach the deadline

## 8. Admin role and internal API

- [x] 8.1 Better Auth: declare `role` in `user.additionalFields` (`input: false`); `locals.user.role` is typed and available
- [x] 8.2 `BotPool` management methods: create N bots in a rating range or one by name/skill, rename (username rules + uniqueness), set skill, retire/reactivate (retired bots are never picked; busy ones finish), `snapshot()` with live states and counts
- [x] 8.3 Settings: load from `setting` over the code defaults at startup, validate, persist, and apply at runtime (re-run `ensurePool` when the minimum rises; the background timer picks up a new interval)
- [x] 8.4 Game server `/internal/*` routes (`GET/POST /internal/bots`, `PATCH /internal/bots/:id`, `PUT /internal/settings`) behind `Authorization: Bearer $INTERNAL_TOKEN` (constant-time compare; disabled if the token is unset); JSON bodies validated
- [x] 8.5 Tests: token required; create/rename/retire/reactivate/settings via the API against `MemoryStore`; a retired busy bot finishes its game and is never summoned again; invalid settings are rejected unchanged

## 9. Admin page

- [x] 9.1 `routes/admin/+layout.server.ts`: 404 unless `locals.user?.role === 'admin'`; server helper that calls the game server with the token (`$lib/server/game-server.ts`)
- [x] 9.2 `/admin` page: pool counts, bot table (sort/filter by name, rating, state, active), create form (count + rating range, or a single bot), per-bot rename / skill / retire / reactivate actions, settings form with validation messages; "game server unreachable" state
- [x] 9.3 `INTERNAL_TOKEN` in `compose.production.yml` (both services), both `.env.example` files, and the dev config
- [x] 9.4 Browser check on localhost: non-admin gets 404; after setting the role in the DB the page loads, creating/retiring bots and changing a setting work and survive a game-server restart

## 10. Wrap-up

- [x] 10.1 `npm test` and `npm run typecheck` pass
- [x] 10.2 Manual check in dev (`web-5175` + game 3002): queue solo, see named opponents with ratings arrive at varying times, play to the end, see every seat's rating change; restart the game server mid-game and resume
- [x] 10.3 Update AGENTS.md (game server section: bot players, summoning, background games, pacing; users table contains bots; bot settings, admin role and `/internal` API, `INTERNAL_TOKEN`) and the layout block
