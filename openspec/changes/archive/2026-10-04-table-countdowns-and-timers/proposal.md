## Why

Online games start and move between hands abruptly: the dealer's clock runs the moment the tiles land, so nobody has a
moment to look at their hand, and the 8 s + 15 s turn timing feels slow in normal play but tight on the dealer's
opening discard. We want snappier regular turns, a longer opening decision for the dealer, and a short, shared
countdown before play starts in each hand.

## What Changes

- Turn timer defaults: own-turn base **8 s → 5 s**, time bank **15 s → 20 s** (still reset every hand). Call base
  stays 5 s.
- The dealer's **first decision of a hand** (before anyone has discarded) gets a **10 s** base instead of 5 s; the
  bank comes on top as usual.
- **Countdown before play**: after the game's first deal, a **5 s** countdown; after every later deal, a **3 s**
  countdown. The between-hands flow is unchanged (results screen, next hand once every connected human is ready or
  after 12 s); the 3 s countdown starts when the next hand is dealt. During a countdown every player sees their new hand
  but no one can act (humans or bots) and no clock runs; the dealer's clock starts when it ends.
- Protocol: `update` gets an optional `countdown` (ms until play starts), sent to every seat. While a countdown runs,
  views carry no legal actions. Additive; old clients just see no countdown.
- The client shows the countdown on the table and a (locked) hand during it.
- **Bots follow the same timings**: bot players and takeover bots wait out countdowns, pace their thinking against the
  new budgets (5 s / 10 s opening / 5 s call + 20 s bank), take longer on the dealer's opening decision like a human
  studying a new hand, and their deliberate timeouts use the full budget of the decision. Background games of bot
  players get the same countdowns, so their games look like human ones.
- **Bots confirm hand results** after their own random, human-like delay. The next hand waits for them as it does for
  humans (still capped at 12 s). Today bots never confirm, so the deal always follows the last human's click, which
  shows that everyone else was a bot. Bot-only games use the same rule instead of their fixed 3–9 s pause
  (`botHandPauseMs` goes away). Only rooms that run without delays (warm-up,
  abandoned games being fast-forwarded) skip countdowns.

## Capabilities

### New Capabilities
- `table-pacing`: turn timer defaults, the dealer's opening-decision time, and the countdowns before play at game start
  and after each deal in online games.

### Modified Capabilities
<!-- None: openspec/specs/ has no synced specs yet; the original timer requirement lives in the archived
     add-game-server change and is superseded by table-pacing. -->

## Impact

- `apps/game-server`: `config.ts` (new defaults, `openingTurnMs`, `startCountdownMs`, `handCountdownMs` + env),
  `room.ts` (hold state, base-time selection, stripped actions + `countdown` in updates), `pacing.ts` (base time passed
  in, longer opening think), tests.
- `packages/protocol`: `update.countdown?: number`.
- `apps/web`: `RemoteGame` (countdown state), `Table` (countdown display), `Table` prop + `Countdown.svelte`.
- AGENTS.md: timer defaults and countdowns in the Game server section.
- Fair play: countdowns depend only on public events (a deal), identical for all seats.
