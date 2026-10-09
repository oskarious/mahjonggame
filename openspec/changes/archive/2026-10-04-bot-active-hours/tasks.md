## 1. Schema and types

- [x] 1.1 Add migration `apps/web/migrations/0004_bot_schedules.ts` (nullable `bot.schedule jsonb`, with `down`)
- [x] 1.2 Update `apps/web/src/lib/server/schema.ts` and `apps/game-server/src/db.ts` (`BotTable.schedule`), move `REQUIRED_MIGRATION` to `0004_bot_schedules`
- [x] 1.3 In `packages/protocol/src/admin.ts`: add `BotSchedule`, the new `BotSettings` fields (`schedulesEnabled`, `regions`, `appetiteMin`, `sessionMin`), `AdminBot.schedule`/`online`, the `offline` state and `online`/`offline` counts

## 2. Schedule maths (`apps/game-server/src/schedule.ts`)

- [x] 2.1 Local time for a zone at an instant (cached `Intl.DateTimeFormat` per zone: weekday, minutes after midnight), zone validation helper
- [x] 2.2 `randomSchedule(random, settings)`: weighted region pick, window archetypes, weekend widening, skewed appetite
- [x] 2.3 Intensity curve `w(schedule, epochMs)` (in-window bump, exponential spill, floor; window chosen by the day it started) and the cached daily integral
- [x] 2.4 Session start probability per tick, session length draw (log-uniform), steady-state online chance for startup
- [x] 2.5 Unit tests with fixed instants: DST zone, window past midnight, weekend vs weekday, peak > edge > spill > night, simulated days give mean online time ≈ appetite and not the whole window, Japan vs Europe at 12:00 UTC, default mix gives Japan the largest share; mutation-check the suite

## 3. Settings

- [x] 3.1 Defaults in `settings.ts` (`schedulesEnabled: true`, Japan-weighted region mix (~55 % Japan), `appetiteMin` 90–240, `sessionMin` 20–150, `botPoolMin` 400)
- [x] 3.2 Validation in `mergeSettings`: `regions` array (valid zones, weights > 0, ≤ 30 entries), minute ranges with their own max; tests for good and bad patches

## 4. Store

- [x] 4.1 `BotRow.schedule`; `PgStore.loadBots`/`createBot` read and write it, new `setBotSchedule(id, schedule)`
- [x] 4.2 `MemoryStore` equivalents

## 5. Pool (`bots.ts`)

- [x] 5.1 `PoolBot.onlineUntil`; `#online(b, now)` honours `schedulesEnabled`
- [x] 5.2 `load()`: generate and store schedules for bots without one; seed online sessions by steady-state chance; `#create` stores a new schedule
- [x] 5.3 `#sessions(now)` in `tick()`: start sessions for active bots outside one (a busy bot past its session may carry on into a new one); an idle bot past its session is offline
- [x] 5.4 `#available` requires online (background games, idle reserve, summon); warm-up uses all idle active bots
- [x] 5.5 Summon fallback: no online fit → wake an offline fitting bot (start a session, enqueue at the normal arrival time); grow only when nobody fits; pool-max path ignores online state
- [x] 5.6 `seated()` (recovery and normal) keeps the bot online at least until the game ends; `roomEnded` leaves expired sessions to go offline on the next tick
- [x] 5.7 `snapshot()`: schedule, online flag, `offline` state, online/offline counts
- [x] 5.8 Pool tests (fake clock + seeded random, schedules on): offline bots never summoned or seated in background games; session ending mid-game finishes the game then goes offline; night human served by a woken offline bot without growth; growth only when nobody fits; schedules off = old behaviour; warm-up ignores schedules; restart seeds some but not all bots online. Existing tests keep schedules off via test settings. Mutation-check the new tests

## 6. Admin UI

- [x] 6.1 `/admin`: show time zone, local time, window and online state per bot; online/offline counts; settings form fields for the switch, appetite and session ranges and the region list (follow the design system)
- [x] 6.2 Check it in the browser (launch configs from dev.md), then stop the dev servers

## 7. Docs and cleanup

- [x] 7.1 Update `docs/agents/game-server.md` (bot players: schedules, sessions, online-only availability, fallback, new pool default, migration `0004`)
- [x] 7.2 Grep for anything made obsolete (old `#available` callers, comments saying bots play at any hour) and remove it
- [x] 7.3 `npm test` and `npm run typecheck` pass
