## Context

Learn lessons are `<Part>` blocks with exactly one `<Exercise id>` each; `exercises.ts` maps id → `Exercise`, and
`lessons.test.ts` validates every exercise against the engine (113 exercises in 26 lessons today). The `Exercise` type,
`goals.ts` and `position.ts` now live in `@mahjong/drills` (shared with the trainers' generator and the game server's
daily-discard job, which stores an `Exercise` per day in the DB).

The card is already split since the trainers landed: `ExerciseCard.svelte` is one exercise, context-free, built once
from its props (re-create it with `{#key}` for the next one), reporting `onresult({ correct, firstTry })` once when it
ends, with an `after` snippet rendered under the feedback once it has ended. `Exercise.svelte` is the thin lesson
wrapper: looks the id up in the lesson context, passes `doneBefore` from progress, calls `markSolved` on a correct
result. The trainers' Practice mode is the precedent for this change: `{#key n}<ExerciseCard>` with a primary "Next"
button in `after` (ui.md: Next sits right under the feedback, in the thumb zone, before the explanation).

Progress (`riichi:learn`, v1) stores solved exercise ids per lesson. `LessonBody` counts parts as
`Object.keys(exercises).length` and ends with a "Practice: … trainer" link where a trainer covers the lesson.

## Goals / Non-Goals

**Goals:**
- Three (or more) hands per part on the same idea, played one after another in the same card.
- Authoring stays as checkable as today: every variant goes through the same engine validation.
- No layout jump in the part when moving to the next variant beyond the hand itself changing.

**Non-Goals:**
- Generated variants. `generate(trainer, level, seed)` exists now, but its filters target a trainer level (any
  1-shanten efficiency hand, any tenpai hand), not a part's idea ("four blocks and four loose tiles", "furiten after
  your own discard"), and generated problems carry no authored `why`. Endless generated practice is the trainers' job,
  linked from the end of the lesson. A part could later take a generated variant behind the same set type if a
  generator filter for its idea is added.
- Changes to `Exercise` itself or to `ExerciseCard` behaviour (trainers and daily-discard depend on both).
- Shuffled variant order, adaptive difficulty, spaced repetition.
- Account-backed progress.

## Decisions

**Set type: `Record<string, Exercise[]>`.** `exercises.ts` exports `exercises: Record<string, Exercise[]>`; a set is a
plain array of complete exercises. Alternatives: a `variants` field on `Exercise` with partial overrides (shorter to
write, but every override needs merging rules and the type stops saying what a variant is), or `Exercise | Exercise[]`
(two shapes everywhere for a transitional convenience). Authors who want to share a prompt or `show` spread a constant
(`{ ...base, position, why }`); nothing in the type needs to know. The type is lesson-only, so it lives in the web
app (`lib/learn/context.ts`, next to `LessonContext`), not in `@mahjong/drills`, whose `Exercise` stays the unit
trainers, the generator and stored daily hands use.

**The set lives in the `Exercise.svelte` wrapper; `ExerciseCard` stays one exercise.** The wrapper holds the current
index and renders `{#key index}<ExerciseCard exercise={set[index]} …>` exactly like the trainers' Practice mode.
Re-keying gives every variant a fresh state for free. `onresult` with `correct` marks that variant solved (a reveal
reports `correct: false` and marks nothing). Alternative: teach `ExerciseCard` about sets — it is context-free and
shared with the trainers, which have their own feed; sets are a lesson concept.

**Next in the `after` snippet, like the trainers.** Same button (`btn primary big`, "Next"), same place (right under
the feedback), so the two sections feel the same; ui.md already states the rule. Not rendered for the last variant.
After Next, if the card top is above the viewport, scroll it into view (the next prompt must be read first).

**Position in the prompt row.** `cur/total` (`2/3`, dim), visible before answering, so the reader knows the set's
length up front. (First built as one dot per variant coloured by state; changed to plain `2/3`, which reads at a
glance; the solved state shows on the card itself.) `ExerciseCard` has
no slot there, so it gains one optional snippet prop (`aside`, rendered at the end of the prompt row); trainers don't
pass it and are unaffected. Alternative: the position above the card from the wrapper — outside the card's surface they
read as page chrome, not as part of the exercise.

**Solved = all variants answered right.** Matches today's rule that reveal doesn't solve. Alternative "set solved when
the last variant is reached" would let a reader reveal their way through; the lesson completion badge should mean the
reader did it. The reader is never blocked: step navigation stays, and revisiting starts the set again from the first
variant, so redoing only the unsolved ones means pressing Next past solved ones — acceptable for
3 items; no jump-to-variant UI.

**Progress v2.** `lessons[slug].solved` becomes `Record<id, number[]>` (solved variant indexes). `loadProgress` reads
v1 and converts each solved id to `[0]`, then saves v2. `markSolved(slug, id, variant)`, `solvedVariants(slug, id)`,
and `completed(slug, sets)` takes `Record<id, count>` (or the sets) to compare. Alternative: keep v1 and store
`id#n` strings — no migration code, but the "old id = first variant" rule then lives in every reader of the list.

**Server render: first variant only.** `index` starts at 0 on server and client, so hydration matches; other
variants are in the JS payload (the lesson's `exercises.ts` is already loaded for the page) but not in the HTML. More
hands in the HTML would bloat the page and mean nothing to a reader without scripts.

**Part count unchanged.** Still one set per part, so `LessonBody`'s `Object.keys(exercises).length` stays correct.

**Test.** `exercisesOf` returns sets; the existing per-exercise `validate` runs per variant in `it.each` rows named
`exercise <id> #<n>`. New checks per set: `length >= 3`, one `kind`, one `goal` for discard/pick, no two variants with
equal `position` (deep-equal after normalising). Position-less `choice` sets (trivia, 29 today) are included: three
questions on the same fact family, distinct by options/answer instead of position.

**Content authoring.** Lesson by lesson, two new variants per set, each aimed at the part's own idea (a "four blocks"
set gets more four-block hands, not harder general efficiency hands). Prefer the same difficulty as the first variant,
optionally a slightly harder third. Variety where it teaches: a different suit or a different correct answer position
in the hand, so the reader can't pattern-match the slot. Every new variant states only what the engine confirms
(`expect` / `claim` / `only` where the prompt or `why` asserts a fact). Strategy sets keep *Riichi Book I* as the
concept reference, never its hands.

## Risks / Trade-offs

- [~226 new hand-made positions is a lot of authoring, and hand-made claims have been wrong before] → the engine test is
  the gate; tasks are split per unit so each batch runs the tests; `why` texts stay short and engine-checkable.
- [Some ideas have few natural variants (rules trivia, "the round ends when…")] → three phrasings on neighbouring
  facts of the same idea; if a set truly can't have three distinct questions, revisit the part rather than add filler.
- [Lesson text referring to the first exercise's tiles becomes wrong for variants 2–3] → review every part text in the
  same pass; text must hold for all variants (spec requirement).
- [Longer lessons may lower completion] → step navigation never requires finishing a set; only the completion badge
  does.
- [Progress migration bug wipes progress] → unit test for v1 → v2 conversion; unreadable data still falls back to empty.

## Migration Plan

Ships as one web deploy. Stored progress converts on first load (v1 → v2); no server state involved. Rollback: an
older build reading v2 data rejects it (`v !== 1`) and starts empty — acceptable for device-only progress.

## Open Questions

- Should trivia-only `choice` sets (no position) be exempt from the 3-variant rule? Proposed: no, but decide per set
  during authoring if a third question would be filler.
