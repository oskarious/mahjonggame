## Why

Bot players are meant to pass for people, but today every active bot is available around the clock: the same names
play at 04:00 and at 20:00, every day, and are free again 10–90 s after each game. Anyone looking at a bot's game
history (or meeting the same opponents at every hour) can tell. Real players sleep, work, eat and only play in part
of their free time, and they live in different parts of the world.

## What Changes

- Every bot player gets a **daily schedule**: a home time zone (drawn from a weighted region mix, mostly Japan —
  riichi's home — plus the rest of East Asia, Europe, the Americas, …) and a free-time window in local time (e.g. 18:00–24:00), with a wider window on weekends.
- Bots are **online only in sessions**. Session starts follow a daily curve that peaks in the middle of the free
  window and tails off before and after it (spill), almost never during sleep. Each bot has its own appetite
  (average play time per day), so sessions are bursts with gaps (meals, other things), not the whole window.
- Only **online** bots are summoned for humans or seated in background games. A bot whose session ends mid-game
  or while queued finishes that game first.
- **Humans are never left waiting because of schedules**: if no online bot fits a waiting human, an offline fitting
  bot may "log on" before a new bot is created.
- Background games and the idle reserve count online bots only; warm-up (fast rating-settling) games ignore
  schedules.
- Schedules are **stored** per bot (new nullable column), generated for new bots and for existing bots on first load.
- Runtime settings gain a schedules on/off switch, the region weights, and the knobs for appetite and session length;
  the admin page shows each bot's time zone, local time and online/offline state, and counts online bots.

## Capabilities

### New Capabilities
- `bot-schedules`: per-bot time zone and free-time window, session-based online presence following a daily curve,
  which bots may be summoned or seated, the offline fallback for waiting humans, persistence, settings and admin view.

### Modified Capabilities
<!-- None: the bot-players change (pool, summoning, background games) is not archived yet, so there is no main spec
     to delta. bot-schedules adds the "must be online" constraint on top of it. -->

## Impact

- `apps/game-server`: `bots.ts` (online state, session ticks, availability, fallback), new `schedule.ts` (schedule
  generation, local-time curve, session sampling), `settings.ts`, `store.ts` + `db.ts` (schedule column),
  `REQUIRED_MIGRATION`, tests.
- `apps/web`: migration `0004_bot_schedules` (adds `bot.schedule jsonb`), `schema.ts`, `/admin` bot list and counts.
- `packages/protocol`: `admin.ts` (`BotSettings` fields, `AdminBot` schedule/online fields, `offline` state/count).
- Docs: `docs/agents/game-server.md` (bot players section).
- Fewer bots are online at any moment, so the default `botPoolMin` must rise to keep enough online bots per hour.
- No client protocol or fair-play change: clients still can't tell bots from humans, and no new information is sent.
