## Why

A bare Elo number (1043, 1187) means little to a casual player. Named ranks (Iron, Bronze, Silver…) give an
at-a-glance sense of level and progress. Ratings already exist and change after every rated game, so ranks can be
derived from them with no new storage.

## What Changes

- Add a fixed, ordered table of 250-point ranks (Iron below 625, Bronze 625–874, Silver 875–1124, …), offset so
  that new players (1000) start in the middle of Silver and a bad first game doesn't drop them a rank.
- Split every rank into sub-ranks 1–5 of 50 points each, 1 lowest (Iron 1 < Iron 3 < Iron 5 < Bronze 1). New players
  start on Silver 3.
- Add one shared, pure function `rankForRating(rating)` that returns the rank, sub-rank and a label ("Silver 3") for
  any rating value, so the web app
  and the game server (and later leaderboards, profiles, the admin page) all derive ranks the same way.
- Ranks are **not stored**: no migration, no protocol message change. Anyone holding a rating can compute the rank.
- Give every rank three colour shades (light, mid, dark) in the shared rank table.
- Add a reusable `RankBadge` component in the web app with a slot for rank icons. There is no art yet: icons are
  plugged in later by dropping one shape per sub-rank (`1.svg` … `5.svg`) into an assets folder, with no code change;
  the badge tints them with the rank's colours, so one set serves all ranks. Until then the badge shows a placeholder.
- Show the badge (icon + rating) wherever a player rating is shown: home, online lobby, table seats, final sheet,
  account and admin. The bot difficulty picker stays plain numbers.

## Capabilities

### New Capabilities
- `elo-ranks`: the rank table (names and Elo spans), sub-ranks 1–5, the shared rating → rank lookup, and the rank
  badge with pluggable icons.

### Modified Capabilities
<!-- none -->

## Impact

- New module `packages/protocol/src/rank.ts`, exported from `@mahjong/protocol` (already a dependency of both apps).
- New tests in `packages/protocol/test/`.
- Web: `apps/web/src/lib/ranks.ts` (icon discovery and lookup), `apps/web/src/lib/components/RankBadge.svelte`, an
  empty `apps/web/src/lib/assets/ranks/` folder, a test for the icon lookup; `docs/agents/ui.md` documents how to add
  icons.
- `docs/agents/game-server.md` (Ratings section) gets a line pointing to the rank helper.
- No DB, protocol-version, engine or fairness impact (a rank is a pure function of a public rating).
