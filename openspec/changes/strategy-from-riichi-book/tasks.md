## 0. Prerequisite

- [ ] 0.1 Finish and archive `interactive-lessons`, so `lesson-curriculum` and `lesson-exercises` exist in
      `openspec/specs/` for this change's deltas

## 1. Test hardening and bug fixes

- [x] 1.1 `lessons.test.ts`: check seat 0's hand size as written (before `scenario()` padding) for every exercise
      position; confirm it fails on the current `riichi` `declare` exercise
- [x] 1.2 Fix `riichi/exercises.ts` `declare` with a real 13-tile hand where the value-vs-wait choice is not in play
      (or move the choice to `riichi-or-dama`); make the "why" match the engine
- [x] 1.3 Add `DiscardGoal 'judgment'` (answers = `only`, required; `stepBack` flag) to `types.ts` and `goals.ts`;
      add the feedback that shows the right answer's numbers on a wrong pick; add the test rule (lowest shanten unless
      `stepBack`)
- [x] 1.4 Rework `tile-efficiency` `honor` and `shape` so no engine-equal discard is marked wrong (judgment with the
      book's reason, or a hand where the goal alone decides)
- [x] 1.5 Mutation check: plant a 12-tile hand, and a judgment answer that steps back; both fail and are named

## 2. Engine: good-wait acceptance

- [x] 2.1 `goodWaitAcceptance` in `packages/engine/src/analysis.ts` (+ export), with tests: two-sided vs closed vs
      edge, two two-sided shapes, not 1-shanten
- [x] 2.2 `DiscardGoal 'max-good-wait'` in goals/feedback; test rule (1-shanten after the discard, not every discard
      correct); mutation check
- [x] 2.3 Note the helper in `docs/agents/engine.md`

## 3. Safety grades

- [x] 3.1 `lib/learn/safety.ts`: `safetyGrades(g, seat)` for genbutsu (own river and passed after riichi), suji per
      rank, both-sides 4/5/6, honors by copies seen, no-chance, one-chance; unit tests for each grade and for "takes
      the safest grade"
- [x] 3.2 `DiscardGoal { safest }` and `PickGoal 'no-chance'` in goals/feedback (feedback names the grades); test
      rules; mutation check
- [x] 3.3 Fairness review: grades read only public state (river, melds, indicators, own hand)

## 4. Decision claims

- [x] 4.1 Extend `choice` `claim` with `tenpai`, `liveWaits`, `goodWait`, `minRon`; compute `minRon` over all waits
      via `declareWin` (no yaku = 0); test each claim; mutation check

## 5. Registry and units

- [x] 5.1 Replace the `strategy` unit with `hand` (Building a hand) and `attack-defense` (Attack and defense); add
      the new lessons in order with SEO titles, descriptions, summaries and related links; fix the defense
      description (kabe is now taught)
- [x] 5.2 Move the "course complete" line from `defense` to `last-hand`; link Riichi Book I as further reading there

## 6. Corrections to existing lessons (see `research.md` audit)

- [x] 6.1 `tile-efficiency`: honors first only while a block is missing; prefer shapes that grow into two-sided
      waits; closed beats edge; "too many shapes" = more than five blocks
- [x] 6.2 `tenpai`: loose tiles cost little, not nothing
- [x] 6.3 `when-to-call`: value pair pon unless cheap and slow; not cheap-and-slow; not big-to-small; replace the
      `simples` exercise with a chii that fills a bad shape into tenpai; the stay-closed rule is "yaku and fast or
      valuable"
- [x] 6.4 `calling`: list all open yaku consistently with `when-to-call`; make the kan exercise either a tenpai
      good-wait hand or clearly mechanics-only
- [x] 6.5 `winning`: replace "discard 1s, 9s and honors early" with keep middle tiles and value pairs, plan riichi
- [x] 6.6 `riichi`: point to `riichi-or-dama` for the discard choice and when to riichi; add the `ema` callout (no
      1000-point requirement under EMA 2025)
- [x] 6.7 `waits`: ryanmen is the best basic wait; 3-sided waits are better
- [x] 6.8 `defense`: genbutsu includes passed tiles; suji details (4–6 need both sides; the riichi tile's suji; early
      suji); add kabe and one-chance with a `no-chance` pick exercise; fold advice moves to `push-or-fold`
- [x] 6.9 `counting-fu`: add a "quick estimate" part (by hand type) with a `choice` or `score` exercise
- [x] 6.10 `glossary.ts`: fix dealer, han, genbutsu, kabe; add block, one-chance, no-chance, dama,
      push, fold

## 7. New lessons (own hands, own words; each part with one exercise)

- [x] 7.1 `shapes`: ranking; middle vs edge tiles; complex shapes and their acceptance (pick `ukeire`); pair count;
      two two-sided shapes (`max-good-wait`)
- [x] 7.2 `five-blocks`: count blocks; five blocks (weak block, 4-tile block); six blocks (drop the weakest); four
      blocks (grow the best loose tile); judgment discards with "why" naming the block
- [x] 7.3 `aiming-for-yaku`: straight / triple sequence worth a small loss, never a step back; pinfu over closed-wait
      sanshoku when the hand has value; when a flush is worth it; seven pairs vs all triplets
- [x] 7.4 `riichi-or-dama`: three reasons to riichi; riichi when tenpai; value vs wait under/over about 5200 (claims
      `minRon`); dama exceptions; don't go tenpai without a yaku if you won't riichi
- [x] 7.5 `push-or-fold`: two of three with claims; from 1-shanten; the safety ranking (`safest` discard); how safe a
      tile must be by distance from tenpai; what to throw with no safe tile
- [x] 7.6 `last-hand`: placement and uma; value needed to move up by ron; tsumo swing vs dealer (engine payments);
      East 4 under default rules, South 4 in east-south games

## 8. Review and finish

- [x] 8.1 `npm test` and `npm run typecheck` pass; every new lesson builds and is in the sitemap
- [x] 8.2 Paraphrase check: no hand, problem or sentence copied from the book (compare against the chapter
      summaries in `research.md`)
- [x] 8.3 Browser check on a phone viewport (launch configs per `dev.md`): the new lessons, a judgment discard, a
      safest discard with ponds, a no-chance pick; then stop the dev servers
- [x] 8.4 Update `docs/agents/web.md` (new goals, judgment-discard rule, safety grades) and remove anything this made
      obsolete (grep for `strategy` unit id, old defense ending)
