## Why

The Learn course takes a reader from the first tile to scoring, then gives only three short strategy lessons.
*Riichi Book I* is the community's standard path from beginner to competent player. Checked against it, our strategy
lessons have real bugs and several rules of thumb that teach bad habits (`research.md`):

- a riichi exercise whose hand can't reach tenpai;
- "always discard honors first";
- "pon a value pair the first time";
- push only in tenpai.

They also stop short of the methods that make a player competent: the five-block method, riichi or dama, push or
fold, and a safety ranking. We want those concepts in our own words, our own hands and engine-checked exercises,
without republishing the book.

## What Changes

**Fix what is wrong today** (the book is the reference for strategy):
- Correct the riichi exercise (a 12-tile hand) and the tile-efficiency exercises whose answers tie with "wrong"
  answers. Make the lesson test check the hand size of every exercise.
- Rewrite the advice the book contradicts: discard order once a hand has five blocks, closed beats edge, value over
  wait when choosing a riichi discard, when not to pon a value tile, calling cheap and slow, push or fold beyond "in
  tenpai", genbutsu including tiles passed after riichi, and the safety order after genbutsu.
- Fix glossary facts: dealer payments, han doubling up to mangan, kabe, genbutsu. Add the missing EMA note: riichi
  needs no 1000 points under EMA 2025.

**Restructure the strategy part of the course** into two units:
- **Building a hand**:
  - tile efficiency (revised);
  - **shapes** (new): shape ranking, complex shapes, pairs, two two-sided shapes;
  - **the five-block method** (new);
  - **aiming for yaku** (new): which yaku are worth bending for, seven pairs vs all triplets;
  - when to call (revised).
- **Attack and defense**:
  - **riichi or dama** (new): when to riichi, choosing between value and wait, dama exceptions;
  - defense (revised: genbutsu, suji in depth, kabe and one-chance);
  - **push or fold** (new): the two-of-three rule, a safety ranking, how safe a tile has to be;
  - **the last hand** (new): placement, uma, the value you need, what a tsumo swings.
- A quick fu estimate added to counting fu.

**New exercise support**, so these lessons are still checked by the engine:
- **Judgment discards**: a lesson names the right discard for a rule the engine can't decide alone, such as five
  blocks or keeping a safe tile. The test still makes sure the answer never steps back in shanten.
- A **good-wait acceptance** measure: the draws that reach tenpai on a two-sided or better wait.
- A **safety grade** for each tile against a riichi player (genbutsu, suji, no-chance, one-chance, honors seen),
  with a "discard the safest tile" goal and a pick goal for no-chance tiles.
- **Claims** that a decision question relies on (tenpai, live winning tiles, the hand's minimum ron value), checked
  against the engine.

## Capabilities

### New Capabilities
- `strategy-lessons`: what the strategy units teach (concepts, rules of thumb and their thresholds), how they use the
  book (inspiration only, our own hands and words, a further-reading link), and how rule differences from the book's
  Tenhou rules are handled.
- `strategy-exercises`: judgment discards, good-wait acceptance, safety grades and their goals, and decision claims
  checked by the engine.

### Modified Capabilities
- `lesson-curriculum`: the Strategy unit becomes two units (Building a hand, Attack and defense) with new lessons.
  This delta targets the spec introduced by the unarchived
  `interactive-lessons` change, so archive that change first.
- `lesson-exercises`: the validation test checks the hand size of every exercise, judgment discards and the new
  claims; new goal kinds are listed.

## Impact

- `apps/web/src/lib/learn/`:
  - `registry.ts`: units, new lessons, new descriptions; defense is no longer the last lesson;
  - `lessons/*`: 5 new lessons and edits to tile-efficiency, tenpai, when-to-call, calling, winning, riichi,
    waits, defense, counting-fu;
  - `glossary.ts`: corrections and new terms (block, one-chance, no-chance, dama);
  - `types.ts` / `goals.ts` / `feedback.ts`: new goals and claims; a new `safety.ts`;
  - `lessons.test.ts`: new checks.
- `packages/engine`: possibly one pure analysis helper (good-wait acceptance) exported from `analysis.ts`. No rule,
  replay or bot changes, so no calibration and no `SAVE_VERSION` bump.
- No game server, protocol or DB changes. Lessons use local engine states only, so fair play is unaffected.
- Docs: `web.md` (new goals, the judgment-discard rule), sitemap entries come from the registry automatically.
- Depends on `interactive-lessons` being archived first (its specs are the base of the two modified capabilities).
