## 1. Rank helper

- [x] 1.1 Create `packages/protocol/src/rank.ts` with the `RANKS` table (id, name, min; lowest `min: -Infinity`), `SUBRANK_SIZE = 50`, the `Rank`/`RankId`/`SubRank` types and `rankForRating(rating: number): { rank: Rank; sub: SubRank; label: string }` (sub-rank counted down from the next rank's min, Master counted up from its own, clamped to 1..5, NaN → Iron 1), with a short header comment like `username.ts` noting the spans are centred on the default start rating (1000)
- [x] 1.2 Re-export it from `packages/protocol/src/index.ts`

## 2. Tests

- [x] 2.1 Add `packages/protocol/test/rank.test.ts` covering the spec scenarios: rank boundaries (624/625), sub-rank boundaries (924/925), top of a rank (1124 → Silver 5), Iron 1 < Iron 3 (400/500), 1000 → Silver 3, 960 → Silver 2, 2400 → Master 5, negative → Iron 1, fractional (874.6 → Bronze 5), NaN → Iron 1, label format, and that the table is strictly ascending with the lowest rank unbounded
- [x] 2.2 Add a monotonicity test: sweeping ratings from -100 to 2500, (rank index, sub) never decreases and every rank shows all five sub-ranks
- [x] 2.3 Mutation check: plant bugs (e.g. `>` instead of `>=`, off-by-one in the sub-rank formula, drop a rank) and confirm the tests fail, then revert

## 3. Rank badge and icon slot (web)

- [x] 3.1 Create `apps/web/src/lib/assets/ranks/` (with a `.gitkeep`) as the icon drop folder
- [x] 3.2 Create `apps/web/src/lib/ranks.ts`: collect icons `1.svg` … `5.svg` with `import.meta.glob` (eager, `?raw`) and make them tintable with a pure `tintable(svg)` (hex fills by lightness → `var(--rank-dark|mid|light)`); header comment explains the naming
- [x] 3.3 Add a test for `tintable` (three shades, style fills and short hex, single fill, more than three fills), and make sure the web test run picks it up
- [x] 3.4 Create `apps/web/src/lib/components/RankBadge.svelte` (`rating`, optional `size`): the sub-rank icon inlined and tinted with the rank's `colors`, or a design-system-token placeholder chip with the label; the label is always the accessible name; every rank in `RANKS` has `colors: { light, mid, dark }`
- [x] 3.5 Check the badge in the browser: drop a temporary `3.svg` into the folder, render badges for Silver 3, Gold 3 and Silver 5 on a scratch page or the account page temporarily, confirm both tints and the placeholder, then remove the temporary files and placement
- [x] 3.7 Make `RankBadge` draw the rating number with the icon to its right (em-based size) and use it for every player rating: home button, online lobby, Board seats, FinalSheet, account, admin bot table

## 4. Docs and verification

- [x] 4.1 Add a line to the Ratings section of `docs/agents/game-server.md` pointing to `rankForRating` in `@mahjong/protocol` (ranks are derived, never stored)
- [x] 4.2 Add a short "Ranks" note to `docs/agents/ui.md`: always draw ranks with `RankBadge`, and how to add icons (folder, file names, square SVG, fallback order)
- [x] 4.3 Run `npm test` and `npm run typecheck`
