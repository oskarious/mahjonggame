## Context

Ratings are pairwise Elo computed in `apps/game-server/src/rating.ts`; players start at 1000 (`startRating`), and the
calibrated bots span roughly 958–1309 (`packages/engine/src/bot-ratings.ts`). The web app shows the raw number on the
home page, the account page, the table (`Board.svelte`) and the final sheet. Both apps depend on `@mahjong/protocol`,
which already hosts shared pure rules (`username.ts`).

## Goals / Non-Goals

**Goals:**
- One source of truth for rank names and spans, and one function `rating → rank`.
- Importable from web (server and client) and game server with no new dependency.
- Trivial to retune spans later, in one place.

**Non-Goals:**
- The icon artwork itself (only the slot is built now).
- Promotion series, decay, or hysteresis around boundaries.
- Using ranks in matchmaking or hint levels (those keep using the raw rating).

## Decisions

- **Location: `packages/protocol/src/rank.ts`, re-exported from the package index.** Protocol is the existing shared
  package for both apps and already holds non-message shared rules (usernames). *Alternatives:* the engine (kept to
  pure game rules, not accounts/ratings); a new `@mahjong/shared` package (overhead for one file).
- **Data-driven table.** `RANKS` is a readonly array of `{ id, name, min, colors }` ordered low → high, with the lowest rank at
  `min: -Infinity` so negatives need no special case; `RankId` is derived from it. The lookup scans from the top for
  the first `rating >= min`. With 7 entries a linear scan is simplest. *Alternative:* chained `if`s like
  `hintLevelForRating`: fine for 2 thresholds, worse for 7 and for listing ranks (e.g. a future rank ladder).
- **Sub-ranks 1–5, computed, not tabled.** `SUBRANK_SIZE = 50`, 5 per rank (5 × 50 = the 250-point rank width). The
  sub-rank is counted down from the next rank's minimum: `5 - floor((nextMin - rating) / 50)`, clamped to 1..5. Counting
  from the top makes the unbounded Iron work (its sub-rank 1 absorbs everything below 425). Master has no next rank,
  so it counts up from its own minimum instead, `1 + floor((rating - min) / 50)`, clamped, with sub-rank 5 unbounded.
  1 is the lowest, as decided (opposite of the LoL-style "division I is best"), so a bigger number always means
  better. *Alternative:* list all 35 sub-ranks in the table: more data, easy to get out of sync with the rank widths.
- **Return `{ rank, sub, label }`**, where `rank` is the table entry `{ id, name, min }`, `sub` is `1 | 2 | 3 | 4 | 5`
  and `label` is `"Silver 3"`. Callers need the id for styling, the label for display, and a future progress bar
  needs `min`. A `nextRank` helper is not added until something needs it.
- **Spans: 250-point ranks, offset so the start rating is centred.** Iron < 625, then Bronze 625, Silver 875, Gold
  1125, Platinum 1375, Diamond 1625, Master 1875. New players (1000) sit in the middle of Silver with 125 points of
  margin either way. A last place costs a new player about 20 against equal opponents (K 40 / 3 × 1.5), at most 40,
  so they can't drop a rank in their first game and typically need several bad results in a row. With sub-ranks they
  start on Silver 3 (975–1024); a typical last place (−20) keeps Silver 3, a worst-case one drops to Silver 2. Moving
  between sub-ranks is meant to feel like progress, so that is fine. Gold is the first
  rank that is earned. *Alternative:* the unshifted 500/750/1000 table from the original example puts newcomers
  exactly on the Silver/Gold boundary, so a first loss would drop them immediately. The bots (≈958–1309) cover Silver
  and Gold, so the outer ranks are reachable but rare.
- **Icons live in the web app, not in protocol.** Protocol is shared with the game server, which never renders
  anything; it only exports `RankId`/`SubRank`, which are the keys icons are looked up by.
- **Icons are discovered by file name.** Files go in `apps/web/src/lib/assets/ranks/` and are collected with Vite's
  `import.meta.glob('./assets/ranks/*.svg', { eager: true, query: '?raw', import: 'default' })` in
  `apps/web/src/lib/ranks.ts`. Adding an icon = dropping in `3.svg`; no code or map to edit. *Alternatives:* a
  hand-maintained `Record<RankId, url>` in `static/ranks/` (an extra edit per icon, easy to forget); icons in protocol
  (drags assets into the game server).
- **One shape set, tinted per rank at runtime.** Icons are one shape per sub-rank shared by all ranks (5 files, not
  35); the rank is told apart by colour. Each rank has `colors: { light, mid, dark }` in `RANKS` (the three shades the
  Kenney-style art uses for top face and sides). `tintable(svg)` sorts the icon's hex fills by lightness and replaces
  them with `var(--rank-dark|mid|light)` (one fill → mid, more than three spread over the three), and the badge
  inlines the result with `{@html}` and sets the variables from the rank, so the art can be drawn in any colours.
  Inlining is needed because an `<img>` can't be restyled; the markup is a build-time asset, not user input.
  *Alternatives:* 35 pre-coloured files (art and colours drift apart, every colour tweak is a re-export); a CSS mask
  (one flat colour, loses the shading); per-rank override files (not needed yet).
- **One `RankBadge.svelte` component** (`rating`, optional `size`) is the only place ranks are drawn, so every future
  spot (home, account, table seat, final sheet, leaderboard) looks the same and gets icons automatically. With an icon
  for the sub-rank it shows that icon tinted in the rank's colours (the art carries the sub-rank); without one, a
  placeholder chip built from design-system tokens showing the label ("Silver 3"). The full label is
  always the accessible name (`aria-label`/`alt`). Icon size is set by the badge, not the art, so any square SVG works.
  It draws the rating number with the icon to its right, in the surrounding text style (icon size defaults to `1.6em`), and
  replaces every plain player rating: home "Play online" button, online lobby, table seats, final sheet (new
  rating), account page and the admin bot list. The bot difficulty picker keeps plain Elo numbers: those are bot
  strengths, not anyone's rating.
- **NaN** is a programming error, but the function returns Iron 1 rather than throwing, so a bad value never breaks a
  page. Guard it explicitly (`Number.isNaN`) because NaN would also poison the sub-rank arithmetic.

## Risks / Trade-offs

- [`startRating` is configurable (env); changing it without moving the table would put newcomers off-centre again] →
  Note in the `rank.ts` header that the spans are centred on the default start rating of 1000.
- [Bots cluster in Silver–Gold, so Iron/Bronze/Platinum and up stay nearly empty early on] → Spans are a constant;
  retune once real rating distributions exist.
- [Changing spans later silently re-ranks everyone] → Intended: ranks are derived, nothing to migrate.

- [A badge component with no icons and no placement is unused code for a while] → It's small, and building it now
  fixes the icon contract (file names, fallback order) before any art is commissioned.
- [Icons must be square SVGs named by rank id] → Documented in ui.md and the `ranks.ts` header; a wrong name just
  falls back to the placeholder, it never breaks.

## Open Questions

- Final names: the seven names are a proposal; confirm before implementing.
