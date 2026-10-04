## 1. Set type and test

- [ ] 1.1 `types.ts`: export `ExerciseSet = Exercise[]`; lesson `exercises` become `Record<string, ExerciseSet>` (`context.ts`, `LessonBody.svelte` props, the lesson route's loader)
- [ ] 1.2 Convert all 26 `lessons/<slug>/exercises.ts` to the set shape, each existing exercise as the set's first variant (no new content yet)
- [ ] 1.3 `lessons.test.ts`: validate every variant (`exercise <id> #<n>` rows), and per set: at least 3 variants, one kind, one goal for discard/pick, no repeated position; failures name slug, id and variant. Keep "uses every exercise kind" working over variants
- [ ] 1.4 Temporarily run the 3-variant check as skipped/todo so the suite stays green until content lands; mutation-check the new checks (two-variant set, mixed kinds, mixed goals, duplicate position, broken variant 2) and confirm each fails with the right name

## 2. Progress v2

- [ ] 2.1 `progress.svelte.ts`: store solved variant indexes per id (`v: 2`), convert v1 on load (solved id → `[0]`) and save; `markSolved(slug, id, variant)`, `solvedVariants(slug, id)`, set-aware `completed`
- [ ] 2.2 Unit tests for the v1 → v2 conversion, unreadable data, and `completed` needing every variant
- [ ] 2.3 Update callers (`LessonBody`, the `/learn` index if it shows completion)

## 3. Card UI

- [ ] 3.1 Move the body of `Exercise.svelte` into `Task.svelte` (one variant, behaviour unchanged) with `onsolved` / `onrevealed` and a slot for the Next button in the feedback row
- [ ] 3.2 New `Exercise.svelte`: reads the set, holds the index, renders `{#key index}<Task/>{/key}`, the variant markers (current / solved / open) in the prompt row, Next after a finished non-last variant, done state from set progress; scroll the card top into view on Next if it is above the viewport
- [ ] 3.3 Styles from the design system tokens (accent current, `--ok` solved, dim open); check the feedback row still takes no room until needed
- [ ] 3.4 Browser check (web-5175 + game launch configs, localhost): solve, wrong + reveal, Next through a set, last variant has no Next, returning visit shows done, phone portrait width, no-JS shows first variant only; stop the servers afterwards

## 4. Content: two new variants per set

For each lesson: write variants 2 and 3 on the part's own idea, add `expect` / `claim` / `only` wherever prompt or `why`
states a fact, make part text hold for every variant, run the lesson tests.

- [ ] 4.1 Basics: how-to-play, tiles, sets-and-winning-hands, table-and-turns, calling, winning
- [ ] 4.2 Reading your hand: tenpai, waits, furiten
- [ ] 4.3 Yaku: first-yaku, riichi, dora, more-yaku
- [ ] 4.4 Scoring: han-and-fu, counting-fu, payments-and-draws, ending-a-game
- [ ] 4.5 Building a hand: tile-efficiency, shapes, five-blocks, aiming-for-yaku, when-to-call
- [ ] 4.6 Attack and defense: riichi-or-dama, defense, push-or-fold, last-hand
- [ ] 4.7 Turn the 3-variant check on for good (remove the skip from 1.4); full `npm test` and `npm run typecheck` green

## 5. Docs and cleanup

- [ ] 5.1 `docs/agents/web.md` Learn section: sets of at least 3 variants, same kind/goal, part text true for every variant, first variant is the server-rendered one, progress v2
- [ ] 5.2 Grep for leftovers of the single-exercise shape (old `Record<string, Exercise>` uses, `solved(slug, id)` callers, comments saying "exactly one exercise" where it now means one set) and remove or update them
