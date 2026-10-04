## Why

Every lesson part has exactly one exercise, so a reader applies an idea once and moves on. One hand isn't practice:
it can be solved by luck or by spotting the one odd tile, and the idea doesn't stick. Several hands on the same idea in
a row ("four blocks: grow the best loose tile", three times) is what makes it usable in a game. The trainers
(`/train`) give endless practice on broad skills (efficiency, waits, yaku, score) and lessons link to them at the end,
but a trainer hand doesn't drill a part's specific idea, and most parts (calls, furiten, defense, rules) have no
trainer at all.

## What Changes

- An exercise becomes an **exercise set**: an ordered list of variants (default **3**) that practise the same idea with
  the same kind of task. The `<Exercise id>` placement in a lesson stays the same; `exercises.ts` gives each id a list.
- The exercise card shows the first variant. Once it is solved or revealed, a **Next** button in the card loads the
  next variant in place, with a small counter (dots, 1 of 3). After the last variant the card shows as done.
- A set counts as **solved** when every variant has been answered right (a revealed variant doesn't count, as today).
  Lesson completion keeps its rule (read to the end, every set solved).
- Device progress (`riichi:learn`) records solved variants; the stored format gets a version bump that keeps existing
  progress (an old solved id counts as its first variant solved).
- `lessons.test.ts`: every set has at least 3 variants, all of one kind (and one goal for discard and pick), every
  variant is validated as exercises are today, and failures name lesson slug, exercise id and variant number.
- **Content**: two new variants for every existing exercise (about 225 new positions across 26 lessons), each checked
  by the engine like the current ones. Part text stays general so it is true for every variant; variant-specific detail
  goes in the variant's prompt and `why`.
- Docs (`docs/agents/web.md` Learn section) updated: authoring sets, the 3-variant rule.

## Capabilities

### New Capabilities
- `exercise-sets`: several variants per exercise placement, the in-card Next flow, set-level solved state and progress,
  and the test rules for sets.

### Modified Capabilities
<!-- The Learn specs (lesson-exercises, learn-section) still live in the unarchived `interactive-lessons` change, not
     in openspec/specs/, so this change adds its rules as a new capability instead of a delta on them. -->

## Impact

- `apps/web/src/lib/learn/`: `context.ts` (set type, lesson-only), `components/Exercise.svelte` (the lesson wrapper
  gains the set: index, position, Next), `progress.svelte.ts` (variant progress, v2 with migration), `LessonBody.svelte`
  (props type), `lessons.test.ts`. `ExerciseCard.svelte` is reused as the trainers use it (`{#key}` re-creation,
  Next in its `after` snippet) and gains one optional snippet for the position (`2/3`) in its prompt row.
- `Exercise` in `@mahjong/drills/types` stays one exercise: trainers, the generator and stored daily-discard hands
  depend on it.
- All 26 `lessons/<slug>/exercises.ts` files (format change plus new variants); some `Lesson.svelte` part texts where
  they refer to the first exercise's tiles.
- No engine, drills, protocol, game-server or DB changes. Server-rendered HTML shows the first variant only (SEO and no-JS
  unchanged in substance).
