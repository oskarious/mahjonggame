## Context

The Learn course (`interactive-lessons`, nearly done and not yet archived) has 20 lessons. The Strategy unit has three
short ones: tile efficiency, when to call, defense. Every exercise answer comes from the engine: `goals.ts` maps a
goal to the correct answers, `feedback.ts` explains, and `lessons.test.ts` validates. `research.md` summarises *Riichi
Book I* and audits our lessons against it: three bugs and about twenty pieces of advice the book contradicts or
oversimplifies.

The difficulty is that much of the book's strategy is a *rule of thumb* (five blocks, keep a safe tile, value over
wait, two of three). The engine can't derive these from shanten and ukeire alone. Raw ukeire often ties, and
sometimes favours the wrong answer. We need exercises for them that stay honest: no hand-made "facts" that the engine
could contradict.

## Goals / Non-Goals

**Goals:**
- Fix every bug and every contradiction listed in `research.md`.
- Add the book's core methods as lessons in two units: Building a hand, and Attack and defense.
- Keep "answers are decided by the engine" wherever a fact is involved. Authored answers are allowed only for the
  rule-of-thumb choice itself, and only on positions whose facts the engine checks.

**Non-Goals:**
- Reproducing the book: no copied hands, problems, tables or wording.
- Hand reading beyond the basics (reading open hands, the discard after a chii), and Tenhou or online-ranking
  material: later, if ever.
- Changing bots or hints. The safety grades and good-wait measure are for lessons only (a bot change would need
  calibration).
- Progress migration: new lessons simply appear as not done. Renamed units don't affect `riichi:learn`, which is keyed
  by lesson slug.

## Decisions

### Units and lessons

The `strategy` unit is replaced by `hand` (Building a hand) and `attack-defense` (Attack and defense):

| Unit | Lessons (slug) |
| ---- | -------------- |
| Building a hand | `tile-efficiency` (revised), `shapes` (new), `five-blocks` (new), `aiming-for-yaku` (new), `when-to-call` (revised) |
| Attack and defense | `riichi-or-dama` (new), `defense` (revised), `push-or-fold` (new), `last-hand` (new) |

Existing slugs stay, so URLs and progress keep working. `riichi` (Yaku unit) keeps the mechanics and links to
`riichi-or-dama` for the decision. The "course complete" line and the further-reading link to the book move to
`last-hand`.

*Alternative:* fold everything into the existing three lessons. Rejected: each concept is a search query of its own
("five block method mahjong", "riichi or dama", "push or fold mahjong"), and parts must stay bite-sized.

### Judgment discards reuse `only`

Add `DiscardGoal 'judgment'`: the correct answers are exactly `only`, which is required for this goal. The test
checks that each `only` kind keeps the lowest shanten among all discards, unless the exercise sets
`stepBack: true`; nothing else is enforced. Feedback reuses the engine's line for the chosen discard ("1 away, with N
tiles…"). On a wrong answer it adds the engine's numbers for the right answer, so the trade is visible ("same tiles,
but …"), and the authored `why` gives the rule.

The existing `max-ukeire` exercises with ties (`tile-efficiency` honor and shape) become `judgment` or
`max-good-wait` exercises, which removes the mislabelled "wrong" answers.

*Alternative:* encode the five-block method as an algorithm (split into blocks, grade blocks). Rejected for now:
splitting a hand into blocks is ambiguous (the book itself shows alternative groupings), and a wrong split would
teach wrong things with the authority of the engine. The `why` names the block instead.

### Good-wait acceptance (engine)

`goodWaitAcceptance(concealed, melds, unseen)` lives in `packages/engine/src/analysis.ts`. It is pure and follows
`analyzeHand`'s conventions. For each live kind that takes a 1-shanten hand to tenpai, it checks whether some
discard after that draw leaves a wait that can still come in 5+ copies (copies not in the own hand: two-sided 8, a 6-tile wait yes; closed, edge, shanpon, single no). It returns those kinds and their live total.
`DiscardGoal 'max-good-wait'`: lowest shanten first, then the highest good-wait total. Only defined for discards that
leave the hand at 1-shanten; the test enforces that.

It belongs in the engine because it is hand analysis, next to `analyzeHand`, and is usable later by hints. No bot
uses it in this change.

### Safety grades (web, `lib/learn/safety.ts`)

`safetyGrades(g, riichiSeat): Map<Kind, 1..8>` follows the order in the `strategy-exercises` spec and uses only
public information. It reuses `unseenCounts(g, 0)` for visible copies, which counts our own hand as visible. That is
correct: the walls you see include your own tiles.
- **Genbutsu**: the riichi seat's own discards, plus tiles others let pass after its riichi. Scenario ponds have no
  global order, so a lesson position lists those tiles in `passed` (checked to be in another seat's river).
- **Suji** for 1/9: the 4/6 is discarded. For 2/8: the 5. For 3/7: the 6/4. For 4/5/6: both sides (1 and 7, 2 and 8,
  3 and 9) are discarded; with one side, grade 7.
- **No-chance / one-chance**: from `unseenCounts`. A tile x is no-chance when, for every two-sided shape that waits on
  x, a needed neighbour has 0 unseen. One-chance is the same with 1 unseen.

It lives in web, not the engine: it is a teaching heuristic, not a rule, and keeping it out of the engine keeps it
away from bots and hints. It is computed from the position the reader sees, so fairness is unaffected.

New goals: `DiscardGoal { safest: Seat }` (all hand kinds in the best grade present) and `PickGoal 'no-chance'` (the
palette defaults to the hand). Feedback names the grade of the chosen tile and of the best one, e.g. "{5p}: only one
suji side discarded. {1z}: genbutsu."

### Decision claims

Extend `choice` `claim` with `tenpai?: boolean`, `liveWaits?: number`, `goodWait?: boolean` and
`minRon?: number`. `minRon` is the lowest ron value over all winning tiles without riichi, ura or ippatsu, computed
by building the win for each wait via `declareWin` / `ronPoints`. A wait with no yaku counts as 0. Push/fold and
riichi/dama questions state these, so the facts are machine-checked even though the decision is authored.

### Lesson test changes

- Hand size: every exercise position's seat-0 hand *as written* must have 13 − 3·melds tiles, plus 1 when the seat
  draws on its own turn. Parse the string before `scenario()` pads it. This catches the `riichi` bug.
- `judgment`: `only` is required, and each kind is at the lowest shanten (or `stepBack`).
- `max-good-wait`: the result is 1-shanten after the discard; there is at least one answer and not every discard is
  one.
- `safest`: the riichi seat is actually in riichi, and not every hand tile is in the best grade.
- Each new claim is checked. Then plant one broken exercise per new rule (mutation check).

### Fixing existing lessons

Per the audit table in `research.md`: edit the text in place, keep each part short (one rule plus its condition), and
replace or retarget exercises whose answers depended on ties. The glossary gets corrections (dealer, han, genbutsu,
kabe) and new terms (block, one-chance, no-chance, dama, push, fold).

## Risks / Trade-offs

- [Authored answers can be wrong in ways the engine can't see] → only rule-of-thumb choices are authored; the facts
  under them (shanten, value, waits, grades) are tested. Each judgment exercise also shows the engine's numbers.
- [Book thresholds assume Tenhou rules] → state them as "about", follow `DEFAULT_RULES` (kiriage, 2-fu double wind,
  East 4 as the last hand), and add `ema` callouts where needed.
- [Safety grades look authoritative but are a heuristic] → the lesson text calls them "safer / riskier", never
  "safe", except for genbutsu. Grades are only used in exercises whose answer is in a clearly better grade, and the
  test forbids "everything is the best grade".
- [Too close to the book] → hands are made from scratch; wording is reviewed for paraphrase; the book is credited as
  further reading, not as a source of text.
- [Longer course for beginners] → the new lessons are at the end, after scoring. The beginner path (Basics → Yaku)
  is unchanged.

## Open Questions

- Should the good-wait acceptance be shown in play-screen hints later? It's out of scope here, but the engine
  placement makes it easy.
- Should `last-hand` use the score-swing table as a `score` exercise (engine payments) or `choice` with `minRon`
  claims? Decide while writing it; both are covered.
