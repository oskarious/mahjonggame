## 1. Set type and test

- [x] 1.1 `lib/learn/context.ts`: export `ExerciseSet = Exercise[]` (from `@mahjong/drills/types`, which stays unchanged); lesson `exercises` become `Record<string, ExerciseSet>` (`LessonContext`, `LessonBody.svelte` props, the lesson route's loader)
- [x] 1.2 Convert all 26 `lessons/<slug>/exercises.ts` to the set shape, each existing exercise as the set's first variant (no new content yet)
- [x] 1.3 `lessons.test.ts`: validate every variant (`exercise <id> #<n>` rows), and per set: at least 3 variants, one kind, one goal for discard/pick, no repeated position; failures name slug, id and variant. Keep "uses every exercise kind" working over variants
- [x] 1.4 Temporarily run the 3-variant check as skipped/todo so the suite stays green until content lands; mutation-check the new checks (two-variant set, mixed kinds, mixed goals, duplicate position, broken variant 2) and confirm each fails with the right name

## 2. Progress v2

- [x] 2.1 `progress.svelte.ts`: store solved variant indexes per id (`v: 2`), convert v1 on load (solved id → `[0]`) and save; `markSolved(slug, id, variant)`, `solvedVariants(slug, id)`, set-aware `completed`
- [x] 2.2 Unit tests for the v1 → v2 conversion, unreadable data, and `completed` needing every variant
- [x] 2.3 Update callers (`LessonBody`, the `/learn` index if it shows completion)

## 3. Card UI

- [x] 3.1 `ExerciseCard.svelte`: one optional `aside` snippet prop rendered at the end of the prompt row (trainers don't pass it; check `/train` still looks the same)
- [x] 3.2 `Exercise.svelte` wrapper: hold the variant index, render `{#key index}<ExerciseCard exercise={set[index]}>` as the trainers' Practice mode does; `onresult` with `correct` → `markSolved(slug, id, index)`; `doneBefore` from set progress; the position (`2/3`) via `aside`; "Next" (`btn primary big`, as in `Trainer.svelte`) in `after` for a finished non-last variant; scroll the card top into view on Next if it is above the viewport
- [x] 3.3 Position styles from the design system tokens (dim ink, tabular numbers)
- [x] 3.4 Browser check (web-5175 + game launch configs, localhost): solve, wrong + reveal, Next through a set, last variant has no Next, returning visit shows done, phone portrait width, no-JS shows first variant only, a trainer page unchanged; stop the servers afterwards

## 4. Content: two new variants per set

For each lesson: write variants 2 and 3 on the part's own idea, add `expect` / `claim` / `only` wherever prompt or `why`
states a fact, make part text hold for every variant, run the lesson tests.

- [x] 4.1 Basics: how-to-play, tiles, sets-and-winning-hands, table-and-turns, calling, winning
- [x] 4.2 Reading your hand: tenpai, waits, furiten
- [x] 4.3 Yaku: first-yaku, riichi, dora, more-yaku
- [x] 4.4 Scoring: han-and-fu, counting-fu, payments-and-draws, ending-a-game
- [x] 4.5 Building a hand: tile-efficiency, shapes, five-blocks, aiming-for-yaku, when-to-call
- [x] 4.6 Attack and defense: riichi-or-dama, defense, push-or-fold, last-hand
- [x] 4.7 Turn the 3-variant check on for good (remove the skip from 1.4); full `npm test` and `npm run typecheck` green

## 5. Docs and cleanup

- [x] 5.1 `docs/agents/web.md` Learn section: sets of at least 3 variants, same kind/goal, part text true for every variant, first variant is the server-rendered one, progress v2; the file map line for `Exercise` (lesson wrapper with the set and progress); `ui.md`: the position (`2/3`) and that lesson Next matches the trainers'
- [x] 5.2 Grep for leftovers of the single-exercise shape (old `Record<string, Exercise>` uses, `solved(slug, id)` callers, comments saying "exactly one exercise" where it now means one set) and remove or update them
