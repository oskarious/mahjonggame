## 1. Config and protocol

- [x] 1.1 `apps/game-server/src/config.ts`: defaults `turnMs 5_000`, `callMs 5_000`, `bankMs 20_000`; add `openingTurnMs 10_000`, `startCountdownMs 5_000`, `handCountdownMs 3_000` with env overrides (`OPENING_TURN_MS`, `START_COUNTDOWN_MS`, `HAND_COUNTDOWN_MS`); update `apps/game-server/.env.example` if it lists timer vars
- [x] 1.2 Add the new keys to the `Pick<Config, …>` used by `Room`
- [x] 1.3 `apps/game-server/test/helpers.ts`: `TEST_CONFIG` sets both countdowns to 0 so existing tests keep their timing
- [x] 1.4 `packages/protocol/src/messages.ts`: `update.countdown?: number` (ms until play starts), documented; guard untouched if it doesn't validate server messages

## 2. Base time per decision

- [x] 2.1 `room.ts`: `#baseMs(g)` = `openingTurnMs` for the dealer's turn with no dealer discards yet in the hand, else `turnMs`/`callMs`; use it for human deadlines and bank charging
- [x] 2.2 Tests: dealer's opening deadline is 10 s + bank; a later dealer turn is 5 s + bank; bank charged only beyond 10 s on the opening turn

## 3. Bot pacing

- [x] 3.1 `pacing.ts`: `PaceOptions` takes the decision's `base` (instead of `turnMs`/`callMs`) and an `opening` flag; opening multiplies the turn median by a named constant (~1.8)
- [x] 3.2 `room.ts`: `#think` and the `#botTimesOut` path use `#baseMs(g)` and pass `opening`; bank charged `delay − base`
- [x] 3.3 `pacing.test.ts`: delays stay within `base + bank − 1 s` for 5 s/20 s and 10 s/20 s; opening median is longer than a normal turn's; `scale: 0` still 0
- [x] 3.4 Room tests: a bot's deliberate timeout on the opening fires after 10 s + bank; a bot exceeding 5 s on a normal turn loses the excess from its bank

## 4. Countdown hold in Room

- [x] 4.1 Add `#holdUntil` and `#holdTimer`; `#startHold(ms)` sets them only when `!#fast && ms > 0` (bot-only rooms included)
- [x] 4.2 `start()`: for a new game (not recovered) start a hold of `startCountdownMs` before the first `#schedule`
- [x] 4.3 `#apply`: on a `handStart` event start a hold of `handCountdownMs` before `#schedule`
- [x] 4.4 `#schedule`: while held (phase `playing`), create no pending decisions (human deadlines, bot moves, bot timeouts); arm one hold timer that queues `#schedule(null)` + a forced update to every connected human when it ends
- [x] 4.5 `#sendUpdate`: while held, send the view with `actions: []` and `countdown` = remaining ms (the "nothing changed" check uses what is actually sent)
- [x] 4.6 `act()`: reject with `illegal` + resync while held
- [x] 4.7 Clear the hold in `close()` and when the abandon fast-forward turns `#fast` on

## 4b. Bots confirm hand results

- [x] 4b.1 `pacing.ts`: `readyDelay(random, { readyMs, scale })` — lognormal median ~2.5 s clamped to 0.8 s–`readyMs`, ~8 % slow confirms uniform 6 s–`readyMs`; constants named
- [x] 4b.2 `room.ts`: `ready` on both seat kinds; on entering `handOver` arm one confirm timer per bot-player seat (delay 0 when `#fast`), which sets `ready` via the queue and deals if `#allReady()`; clear them in `close()`, on fast-forward and when the hand is dealt
- [x] 4b.3 `#allReady()` also requires every bot player to be ready; `readyMs` cap unchanged; remove the `botHandPauseMs` branch and config key (bot-only rooms use the same rule)
- [x] 4b.4 `pacing.test.ts`: `readyDelay` stays within bounds, median near 2.5 s, some slow draws, `scale: 0` → 0
- [x] 4b.5 Room tests: human confirms at once + bot delay 4 s → deal at ~4 s; slow human → deal at the human's confirm; bot-only room deals when its last bot confirms; fast room deals at once; deal times vary across hands with a seeded random

## 4c. Joining before the start countdown

- [x] 4c.1 `config.ts`: `joinMaxMs` 10 s (env `JOIN_MAX_MS`); `TEST_CONFIG` 0; `pacing.ts`: `joinDelay(random, { maxMs, scale })`
- [x] 4c.2 `room.ts`: joining phase for fresh, non-fast rooms: connected humans joined at once, bots after `joinDelay`, cap timer; attach/detach re-check; when complete start the 5 s hold and force-send updates; held (no actions, no countdown) meanwhile; cleared on close / fast-forward
- [x] 4c.3 Tests: countdown starts when the last bot joins (not at the match); cap at 10 s with a disconnected-then-slow case; act rejected while joining; `joinDelay` distribution and scale; mutation check

## 5. Game server tests

- [x] 5.1 Game start: every human gets `countdown ≈ 5000`, empty actions, no deadline; an `act` during it is rejected; after 5 s the dealer gets actions and a 10 s + bank deadline
- [x] 5.2 Between hands: ready from all humans → next hand dealt with a 3 s countdown; a slow confirmer delays the deal, not the countdown length; ready-timer expiry also leads into the 3 s countdown
- [x] 5.3 A bot dealer at a table with a human doesn't act before the countdown ends; its delay is measured from the end of the countdown
- [x] 5.4 A takeover bot (disconnected human) waits for the countdown
- [x] 5.5 Bot-only room: 5 s hold at start, bots' confirms then 3 s hold between hands, no bot acts while held
- [x] 5.6 Warm-up (`fast`) and fast-forwarded rooms have no countdown
- [x] 5.7 Reconnect during a countdown receives the remaining countdown
- [x] 5.8 "Room hidden information" / fairness tests still pass; plant a bug (e.g. countdown only to the dealer) to check a test catches it

## 6. Client

- [x] 6.1 `Table` prop `countdownUntil` (like `deadlineAt` / `bank`, passed by the online page; not on `GameSource`)
- [x] 6.2 `RemoteGame`: set `countdownUntil` from `update.countdown` (null when absent); clear it on `game.end`
- [x] 6.3 `Table`: while `countdownUntil` is in the future, show the remaining whole seconds as one large number centred over the board (no label); hides at 0
- [x] 6.4 Browser check on localhost: start an online game against bots, see the 5 s countdown with a locked hand, then the dealer's 10 s timer; finish a hand and see the 3 s countdown after ready; stop the dev servers afterwards

## 7. Docs and checks

- [x] 7.1 Docs (AGENTS.md was split into docs/agents/: game-server.md, fair-play.md, roadmap.md, web.md): "Timers" bullet: 5 s / 5 s / 20 s, 10 s dealer opening, 5 s / 3 s countdowns (room-level hold, actions stripped, bot-only rooms too), bots' opening think; "Between hands" sentence: bot players confirm after a random delay, `botHandPauseMs` gone; "Bot players" background-games bullet mentions the countdown; "Where this is going": update the timer-defaults line
- [x] 7.2 `npm test` and `npm run typecheck` pass
