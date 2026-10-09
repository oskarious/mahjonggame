## 1. Reusable exercise card

- [x] 1.1 Split `lib/learn/components/Exercise.svelte` into `ExerciseCard.svelte` (props `ex`, reset key, `final`, `onresult({ correct, firstTry })`, a snippet after the feedback) and a thin lesson `Exercise.svelte` (context lookup by id, `markSolved`)
- [x] 1.2 Make the card's state fully reset when `ex` / the key changes (status, picks, fu step, focus, marks)
- [x] 1.3 `final` mode: the first answer ends the exercise (no retry, no reveal button) and the right answer is shown
- [x] 1.4 Run the lesson tests and click through two lessons of each exercise kind to confirm nothing changed

## 2. Problem generation (`lib/train/`)

- [x] 2.1 Seed helpers: derive sub-RNGs from `(trainer, level, seed, n)` with the engine RNG; short base36 seeds; daily seeds `daily/<date>/<i>`
- [x] 2.2 Self-play driver: play a hand from a seed with `botAction` (seeded `random`, cheap skill) for all seats, seat 0 optionally passing every call; yield the moments each trainer needs (seat 0's turns, seat 0 tenpai after a discard, wins with their `WinRecord`)
- [x] 2.3 Rebuild a game moment as a `Position` with seat 0 as the reader: rotate seats; hand, melds, dealer, round/seat wind, riichi, dora and ura indicators; the winning tile as a draw or a `discard: true` from its seat; efficiency positions with hand + dora indicator only
- [x] 2.4 Skip wins a rebuild can't carry (ippatsu, haitei, houtei, rinshan, chankan, tenhou/chiihou/renhou, double riichi, pao); take the first win of a multiple ron
- [x] 2.5 Efficiency generator (levels 1/2/3 shanten; reject all-tie hands and, at Normal/Hard, an isolated honor as the only best discard) → `discard` exercise, goal `max-ukeire`
- [x] 2.6 Waits generators: Normal from self-play (single-wait cap), One suit drawn directly (≥ 3 winning kinds, suit varies) → `pick` exercise, goal `waits`
- [x] 2.7 Yaku generator (2+ yaku quota, no dora options) and score generator (modes `han-fu`, `points`, `fu`) from self-play wins
- [x] 2.8 Budget: bounded games/candidates per problem with fallback to the next derived game; measure generation time on the server and in a phone-class browser, and record it in the design

## 3. Problem tests

- [x] 3.1 Seed sweep per trainer and level: determinism (same seed → same `Position`), at least one right answer by the engine, filters and quotas hold, budget kept
- [x] 3.2 Rebuilt wins score exactly as the game paid them (han, fu, points) across the sweep
- [x] 3.3 Unit tests for the spec scenarios (nobetan waits, tied discards accepted, points option for 3 han 30 fu non-dealer ron)
- [x] 3.4 Mutation check: disable the all-ties filter, the luck-yaku skip and the seat rotation in turn; each must fail a test

## 4. Trainer UI

- [x] 4.1 Trainer registry (`lib/train/registry.ts`): slug, SEO title/description, intro line, levels, modes, generator, lesson link
- [x] 4.2 Discard table component: every distinct discard best first (shanten, count, improving tiles), the reader's row and best rows marked; shown after an efficiency answer
- [x] 4.3 Trainer page `/train/[trainer]`: SSR first problem (`+page.server.ts`, honours `p` and `level`), level chip, Practice flow (retry, reveal, Next in the thumb zone), next problem pre-generated, problem link (`?p=`) updated per problem
- [x] 4.4 Rush mode: 3-minute clock bar, score, three strike pips, final answers, strike shows the answer briefly, level climbs every five solved, end screen with best
- [x] 4.5 Stats store `riichi:train` (versioned, read on mount, storage errors ignored): answered, first-try correct, streak, best streak, Rush best; Daily days and streak
- [x] 4.6 Daily set `/train/daily`: 2 efficiency, 1 waits, 1 yaku, 1 score from the UTC date; final answers; result screen with the share line, Copy and Share with fallbacks for insecure contexts; a finished day shows its result
- [x] 4.7 Hub `/train`: a card per trainer with its stats, the daily card with today's state

## 5. Site integration

- [x] 5.1 Home page Train entry; Train in the Learn header navigation if it has one
- [x] 5.2 "Practice" link at the end of the efficiency, waits, yaku and scoring lessons, from the registry; trainer pages link back to their lesson
- [x] 5.3 SEO: titles, descriptions, canonical URLs, Open Graph, sitemap entries for the hub, trainers and daily; CTA on every Train page
- [x] 5.4 Design system: add the trainer header, rush bar and discard table (or note the deviation) — noted as a deviation in `ui.md` (Train pages)

## 6. Verification and docs

- [x] 6.1 Browser check on localhost at phone portrait and desktop: each trainer in Practice and Rush, Daily start to share, shared link reproduces the problem, no layout shift on hydration; stop the dev servers afterwards
- [x] 6.2 `npm test` and `npm run typecheck` pass
- [x] 6.3 Docs: `web.md` (Train section, generators, stats key, adding a trainer), `ui.md` (trainer screen, discard table, rush bar); remove anything the card split made obsolete
