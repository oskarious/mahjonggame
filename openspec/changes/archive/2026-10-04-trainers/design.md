## Context

`research.md` surveys the trainers elsewhere. The common shape is clear (tap a discard, then a ranked ukeire table;
pick waits; han/fu/points quizzes; a daily shared set; streaks without an account). The weak spots are reveal-only
answers, no explanation, desktop settings walls, and no progression. Riichi City and Mahjong Soul offer AI game
review, not drills.

What we have:

- **Learn exercises** (`apps/web/src/lib/learn`): a typed `Exercise` (kinds `discard`, `pick`, `yaku`, `score`,
  `fu`, …) over a serializable `Position`; `goals.ts` computes the right answers with the engine (`max-ukeire`,
  `waits`, `yakuQuiz`, `scoreQuiz`, `fuSteps`); `feedback.ts` writes engine-based explanations; `Exercise.svelte`
  renders the slice with the real `PlayerArea` input. The card is tied to the lesson (`getContext(LESSON)`, exercise
  ids, `markSolved`).
- **The engine**: pure and seeded (`createGame(rules, seed)`, `applyAction`, `pendingSeats`, `legalActions`),
  `botAction` with an injectable `random`, `scenario()`, `analyzeDiscards`, `scoreHand`, the RNG helpers.
- **SSR pages with the CTA** (Learn), a `riichi:learn` per-device progress store, `sitemap.xml` from a registry.

## Goals / Non-Goals

**Goals:**

- Endless drills for the four most-used skills (efficiency, waits, yaku, scoring) that are always right and always
  say why, because the engine decides and explains.
- Phone-first: one hand, the game's own input, the answer and Next in the thumb zone, no settings wall (one level
  control, one mode control).
- Repeat visits: streaks, Rush bests, a daily set with a shareable line.
- Search entry points next to the course; every page leads to sign-up.

**Non-Goals:**

- Rated puzzles / a puzzle rating, leaderboards, account-synced stats (follow-ups; seeds keep them possible).
- Defense, shanten-counting, tenpai-recognition, call and push/fold trainers (follow-ups on the same machinery;
  `safety.ts` grades are lessons-only heuristics for now).
- Reviewing the player's own games (the AI-review pattern).
- Hand-authored problem sets, or importing hands.
- Showing ponds in efficiency problems (realistic visible-tile counting): v1 counts against hand + dora indicator,
  like most trainers.

## Decisions

### 1. Generated problems, not a problem bank

A trainer problem is `generate(trainer, level, seed) → Exercise` (a Learn exercise over a `Position`). Pure, seeded,
same on server and client, so the server renders the first problem and the client hydrates it, and a URL (`?p=seed`,
plus `level`) replays a problem.

*Alternatives:* a curated bank (finite, needs authoring, and authored claims were what the lesson test kept
catching); a precomputed JSON pool (fixed ids are what a puzzle rating needs, but adds a build step). The generator
makes a pool trivial later (`seed` list), so we start with generation.

### 2. Hands from bot self-play, rebuilt as positions

Random 14-tile deals look nothing like hands people hold mid-game. The generator plays a bot game from the seed
(`createGame` + `botAction` for every seat with an RNG derived from the seed) and harvests moments:

- efficiency: the first turn of any seat without calls whose hand is at the level's shanten and passes the filter;
- waits (Normal): the first closed tenpai hand, right after its discard;
- yaku / score: any win, skipping wins whose value a rebuild can't carry (ippatsu, haitei, houtei, rinshan,
  chankan, tenhou/chiihou/renhou, double riichi).

The first moment that passes the trainer's filter is taken (stopping the game there); if a game has none, the next
game seed (`.../n`) is played, up to a budget of 16 games, after which the filters are dropped. Generator bots use
the skill-0.6 profile without defense, reading or blunders: that, and taking any seat rather than one reader that
passes its calls, cut generation from ~50–200 ms to ~10–70 ms per problem in Node (wins and Normal waits are the
slowest; the next problem is generated while the reader thinks). The moment is **rebuilt** as a `Position` with seat 0 as the reader
(rotate seats so the winner is 0; dealer, winds, dora/ura indicators, riichi, other seats' quads for kan dora, the
winning tile as a draw or another seat's `discard: true`). `WinFigure` now shows the ura indicators of a riichi
win, or a value with ura dora would not add up. Efficiency positions keep only the hand and dora indicator. Rebuilding (rather than holding
a mid-game `GameState`) keeps the problem plain data that every Learn function already takes, and hides the other
hands by construction. The seed-sweep test asserts the rebuilt value equals the game's `WinRecord`.

One-suit waits don't occur in play often enough: they are drawn directly (13 tiles of one suit from the seed RNG,
kept when tenpai on ≥ 3 kinds).

*Alternative:* bias the deal toward the target shanten. Cheaper, but hands look random and the filter does the same
job.

### 3. Filters make each problem a decision

Rejected candidates: efficiency hands where all lowest-shanten discards tie (npmahjong does the same) or where the
only best discard is an isolated honor (Normal/Hard); single-wait hands are capped in Normal waits; at least half of
yaku problems have 2+ yaku. Levels: efficiency by shanten (1/2/3), waits Normal / One suit, score by mode (han-fu,
points, fu builder). Rush climbs efficiency Easy → Normal → Hard every five solved.

### 4. Grading and explanations reuse Learn

- Efficiency = `discard` with goal `max-ukeire`; feedback from `discardFeedback` ("2 away, 18 tiles; another discard
  leaves 22"). New: a **discard table** after the answer (every distinct discard from `analyzeDiscards`: shanten,
  count, tiles; the reader's row and best rows marked), the "why" every other trainer stops short of. Good-wait counts
  (`goodWaitAcceptance`) are not graded in v1.
- Waits = `pick` / `waits` with `pickFeedback`; the reveal shows every wait.
- Yaku = `yaku` (dora never an option; `yakuQuiz` already uses common-yaku distractors).
- Score = `score` (`han-fu` or `points`) and `fu`.

The answer key is computed once per problem; nothing is hand-listed.

### 5. Split the exercise card

`Exercise.svelte` becomes `ExerciseCard.svelte` (props: `ex`, a key to reset state, `final` (no retry, for Rush and
Daily), callback `onresult({ correct, firstTry })`, and a slot after the feedback for the discard table), and a thin
lesson `Exercise.svelte` that looks up the id in the lesson context and marks progress. Lessons render as before.

### 6. Pages and state

- Routes: `/train` (hub: cards per trainer with stats), `/train/[trainer]` (`efficiency | waits | yaku | score`;
  query `level`, `mode=practice|rush`, `p`), `/train/daily`. A registry (`lib/train/registry.ts`) lists trainers:
  slug, SEO title/description, levels, generator, lesson link. It also feeds the hub, the sitemap and the
  "Practice" links at the end of lessons.
- SSR: `+page.server.ts` picks a seed (or takes `p`), generates and returns the exercise; the client continues with
  seeds from its own RNG (seeded per page load, so a refresh gives new problems). Daily seeds are
  `daily/<YYYY-MM-DD>/<i>` (UTC).
- Stats: `lib/train/stats.svelte.ts`, key `riichi:train`, versioned like `riichi:learn`, read on mount: per trainer
  `{ answered, firstTry, streak, bestStreak, rushBest }`, daily `{ days: { date: marks }, streak }`.
- Rush: a client-only state machine (`ready → running → over`); the clock uses `performance.now()`; a strike shows the
  right answer for ~1.2 s, then the next problem. The next problem is generated ahead while the reader thinks, so
  Next is instant.
- Daily share: a text line (`Riichi Arena daily 2026-10-04 ●●○●●`) with Copy (`navigator.clipboard` when available,
  else a selected text field) and `navigator.share` when available: these are secure-context-only, and LAN testing
  runs insecure.

### 7. Layout (portrait, one-handed)

Top: trainer name, level chip, mode toggle (Practice / Rush), stats strip (streak; in Rush the clock bar, score,
three strike pips, no labels). Middle: the exercise card (prompt, panel and hand, as in lessons). Bottom (thumb):
feedback, then a full-width Next. The discard table scrolls below the feedback. Minimal text; trainer pages carry a
short intro below the drill for search (the Learn exception, kept small). New design-system pieces: trainer header,
rush bar, discard table; added to the design system or noted as a deviation.

## Risks / Trade-offs

- [Self-play is slow on the server] → measure; budget per problem (e.g. ≤ 4 games); bots at a cheap skill for
  generation; if SSR p95 is too high, precompute a seed pool at build time (decision 1 keeps that open).
- [Rebuilt positions drift from the game] → skip luck-dependent wins; the seed sweep compares every rebuilt value
  with the game's payment.
- [Ukeire-only grading calls a shape-better discard wrong] → only the top count is right, but ties all pass, the
  table shows how close a choice was, and the efficiency lesson already teaches good-wait judgment separately. A
  "close" grade or good-wait scoring is a follow-up.
- [Bot changes alter every seed's problem] → shared links and past daily sets change after a bot recalibration.
  Accepted (no stored problems yet); a version prefix in seeds (`v1:`) lets us keep links working if it matters.
- [Bot hand distribution is narrow (riichi / tanyao / yakuhai)] → yaku filter quota; widen with distribution checks
  in the seed sweep.
- [SEO pages with little text] → each trainer page has a short intro and links to its lesson; the first problem is
  in the HTML.

## Open Questions

- Should Rush offer a 5-minute and a survival variant (chess.com has both), or only 3 minutes at launch?
- Daily: one mixed set (proposed) or one per trainer?
- A signed-in "best Rush" on the account page is cheap later (DB-backed); worth doing before a puzzle rating?
