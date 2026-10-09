## Context

`Room` (apps/game-server/src/room.ts) drives every online game through one serialized pipeline. `#schedule` makes
timers match the state: for each pending seat a human deadline (`base + bank`) or a bot move after `thinkDelay`. The
base is `turnMs` (8 s) or `callMs` (5 s), the bank `bankMs` (15 s), reset on `handStart`. Between hands the room waits
for `ready` from every connected human or `readyMs` (12 s), then applies `nextHand`, which deals and puts the dealer on
turn immediately. A new game's opening events are broadcast in `start()` and the dealer's clock starts at once.

Clients get `update { view, events, seq, deadline?, bank? }`; `view.actions` drives every button and discard gesture,
and `RemoteGame.#automate` (auto-pass / riichi auto-discard) also keys off `view.actions`.

## Goals / Non-Goals

**Goals:**
- New defaults 5 s turn / 5 s call / 20 s bank, and 10 s base for the dealer's opening decision.
- A shared, locked countdown before play: 5 s at game start, 3 s after each later deal.
- Keep Fair play: nothing about the countdown depends on hidden state.

**Non-Goals:**
- Offline play (no timers there today).
- Changing the human side of the between-hands ready flow or its 12 s cap (only bots start confirming).
- A countdown when a recovered game resumes after a redeploy (humans start disconnected; grace handles it).

## Decisions

**1. A room-level hold (`#holdUntil`), not an engine state.** The countdown is pacing, not rules: the engine stays
unaware and replays are unaffected (no new action, no `SAVE_VERSION` / stored-log impact). The room sets
`#holdUntil = now + ms` when it broadcasts a deal (`start()` for a new game: `startCountdownMs`; `#apply` when the
events contain `handStart`: `handCountdownMs`) — unless `#fast`. Bot-only rooms hold too (see decision 7). While `Date.now() < #holdUntil`,
`#schedule` creates no pending decisions and instead arms one `#holdTimer` that runs `#schedule(null)` through the
queue when the hold ends. Alternative considered: a new engine step `countdown` — rejected; it would change stored
logs and the engine has no clock.

**2. Locking by stripping `view.actions` during the hold.** `#sendUpdate` sends `{ ...view, actions: [] }` and
`countdown: holdUntil - now` while held. The client then has nothing to click, flick or auto-play without any new
lock logic, and a modified client's `act` is rejected server-side (`act()` checks the hold and answers `illegal` +
resync). Tenpai info in the view stays, so players can inspect their hand. When the hold ends, `#schedule` sets the
dealer's deadline and the room sends updates (forced, so the dealer gets its actions and deadline; other seats'
views are unchanged and are skipped by the existing "nothing changed" rule). Alternative: send actions plus a
client-side lock — rejected; two sources of truth and every input path would need the check.

**3. Countdown is public by construction.** It starts on a deal (a public event), has a fixed length and is sent to
all seats in the same broadcast. The update at hold end goes only to seats whose view changed (the dealer gets its
actions back); which seat is dealer is public. The hidden-information tests keep covering this (the hold doesn't read
state beyond `handStart`).

**4. Base time per decision in one helper.** `#baseMs(g)` returns `openingTurnMs` (10 s) when the step is the
dealer's turn and the dealer has no discards yet in this hand, else `turnMs` / `callMs`. Used for human deadlines,
bank charging, the bot-timeout path, and passed to `thinkDelay` (which takes `base` instead of deriving it from
`turnMs`/`callMs`), so bot pacing and bank use follow the same rule.

**5. Config.** `DEFAULT_CONFIG`: `turnMs 5_000`, `callMs 5_000`, `bankMs 20_000`, new `openingTurnMs 10_000`,
`startCountdownMs 5_000`, `handCountdownMs 3_000`, each overridable by env (`OPENING_TURN_MS`, `START_COUNTDOWN_MS`,
`HAND_COUNTDOWN_MS`). `TEST_CONFIG` sets both countdowns to 0 so existing tests keep their timing; new tests set them.

**7. Bots under the new timings.** Bots get no special path; they go through the same `#schedule`, so:
- *Countdown*: no pending entry (bot move or bot timeout) exists while held, so the `thinkDelay` timer is only armed
  when the hold ends and is measured from there. Takeover bots are covered the same way.
- *Budget*: `thinkDelay` receives the decision's base from `#baseMs(g)` (10 s on the opening) and the seat's bank
  (20 s), so its existing clamp ("never within `DEADLINE_MARGIN_MS` of base + bank") and long-think formula
  (`base × 0.6–1 + 0.6 × bank × r`) follow the new values automatically. `#think` charges `delay − base` to the
  bank as today.
- *Opening think*: humans sort and study a fresh 14-tile hand, so a bot that answers the opening as fast as a mid-hand
  discard would be a tell. `thinkDelay` gets an `opening` flag (true when `#baseMs` chose `openingTurnMs`) that
  multiplies the turn median by ~1.8 (tunable constant) — median roughly 2.5–4 s, still well inside 10 s.
- *Deliberate timeouts*: `#botTimesOut` path uses `#baseMs(g) + bank`, i.e. 10 s + bank on the opening.
- *Bot-only background games* hold as well: the bots' confirms (decision 8) come first, then the 3 s countdown; 5 s at
  game start. Their durations and action timestamps then look like games
  with humans in them (game records are meant to show bot players like humans). Warm-up rooms (`fast`) skip it.
- Recalibration is not needed: `botAction` decisions don't change, only when they are sent.

**8. Bots confirm hand results.** Today `#allReady()` only counts connected humans and bots never confirm, so the deal
follows the last human's click every time, and a human who always clicks at once always "starts" the hand. Clients
never see who is ready, but they see when the deal comes, and that timing is the tell.
- On entering `handOver`, the room draws a confirm delay per bot-player seat with `readyDelay(random, scale)` in
  `pacing.ts` and arms one timer per bot that sets its `ready` flag through the queue and then checks `#allReady()`.
  `ready` moves from `HumanSeat` to both seat kinds.
- `#allReady()` = every connected human and every bot player (`kind === 'bot'`) is ready. Disconnected humans /
  takeover seats are still not waited for (unchanged). The `readyMs` cap still applies to everyone.
- Distribution (constants in `pacing.ts`): a lognormal with median ~2.5 s, clamped to 0.8–`readyMs`; plus ~8 % "slow"
  confirms drawn uniformly from 6 s to `readyMs`, so the cap occasionally decides. With four bots, the maximum is what
  matters in bot-only games: expect ~4–6 s typical, which is close to the old 3–9 s pause. × `thinkScale`; 0 in fast
  rooms.
- Bot-only rooms use the same path, replacing `botHandPauseMs` (removed from config). Rooms with no human connected
  still skip waiting for the absent humans but do wait for the bots, so abandoned-but-not-yet-fast games keep a
  natural rhythm.
- Fair play: the delays come only from `random`, never from state; the hidden-information tests already compare bot
  timings on scrambled states, so they cover it once the ready timers go through `#random`.
- Alternative: one random "table delay" instead of per-bot delays. Rejected: with several bots, per-bot maxima give
  the natural "wait for the slowest" shape, and per-bot timers keep the logic identical to humans.

**9. Joining phase before the start countdown.** Matched humans are already connected, so without it the start
countdown always begins at the human's arrival. A fresh room (not fast, `joinMaxMs > 0`) starts *joining*: `#held()`
is true, updates carry no `countdown` and no actions. Humans with a connection count as joined at once (attach during
joining joins, a detach stops waiting for that seat); each bot joins after `joinDelay` (pacing.ts: lognormal, median
~1.5 s, 0.4 s – `joinMaxMs`, × `thinkScale`). When every seat has joined, or `joinMaxMs` (10 s) passes, the room
starts the 5 s hold and force-sends every connected human an update with the countdown (the view is unchanged, so the
"nothing changed" rule would otherwise skip it). No per-seat "joined" indicator is sent (minimal UI; can be added
later since the delays are random anyway). `TEST_CONFIG` sets `joinMaxMs: 0` (no joining) like the countdowns.

**6. Protocol and client.** `update.countdown?: number` (ms remaining, only while held). `RemoteGame` stores
`countdownUntil` (Date.now based, like `deadlineAt`); `GameSource` gets an optional `countdownUntil`; `Table` shows
the remaining whole seconds as one large number centred over the board while it is in the future (no text label,
per the minimal-text rule). `PROTOCOL_VERSION` is not bumped: the field is optional and old clients degrade to "no
buttons for a few seconds".

## Risks / Trade-offs

- [Hold timer vs. abandon fast-forward] → When `#fast` is switched on, clear the hold and its timer before
  rescheduling.
- [Takeover bot during a hold] → Takeover only changes `#botPlays`; `#schedule` still respects the hold, so the bot
  waits like everyone else.
- [Reconnect during a hold] → `attach` runs `#schedule(null)` + `#sendUpdate`, which includes the remaining countdown
  and the stripped view.
- [Ready timer runs while nobody is connected] → Unchanged; with nobody connected the hold still applies (it's cheap)
  unless the room is fast-forwarding.
- [Bot-only games get ~3 s longer per hand] → Slightly fewer background games per hour; negligible, and it's what a
  human-populated table would take.
- [Shorter 5 s base feels rushed on complex turns] → The 20 s bank absorbs it; all values are config.

## Migration Plan

Server and client deploy together (one compose app). Running games keep going: rooms rebuilt on recovery get the new
defaults and no initial countdown. Rollback is a redeploy; nothing is stored.

## Open Questions

- Should offline play get the same countdown for consistency? (Out of scope here.)
