## 1. Engine: public scenario builder

- [x] 1.1 Move `rig()` / `RigOptions` (and `makeMeld` etc.) from `packages/engine/test/helpers.ts` to
      `packages/engine/src/scenario.ts` as `scenario()` / `ScenarioOptions`; export from `src/index.ts`
- [x] 1.2 Validation: hand size per melds (names seat and expected count), five-copy detection incl. red fives,
      out-of-tiles error
- [x] 1.3 Point engine tests at the export; delete the old copy; `npm test` + `npm run typecheck` green
- [x] 1.4 Tests for the spec scenarios; mutation-check
- [x] 1.5 Document `scenario()` in `docs/agents/engine.md`

## 2. Sign-up page

- [x] 2.1 `src/routes/signup` (`+page.svelte`, `+page.server.ts` redirecting signed-in users via `safeNext`): the
      sign-up form from `/login`, own title/description, link to `/login` keeping `next`
- [x] 2.2 `/login`: sign-in only, link to `/signup` keeping `next`; delete the mode toggle and its styles
- [x] 2.3 Entry points: home page "Sign up" next to "Sign in"; guest online entry → `/signup`; grep for other
      sign-up links
- [ ] 2.4 Browser check: sign up with `next=/online` lands in the lobby; unsafe `next` → home; signed-in → redirect
      → Partly verified: guest HTML, links keeping `next`, the signed-in redirect to `next` and the /online guard
      (→ /signup) work. Creating an account end to end not run: the browser pane is signed in to a test account.

## 3. Components usable outside the table, on the server

- [x] 3.1 Make `Tile`, `Pond`, `Melds`, `PlayerArea` SSR-safe (no browser globals at init; tileset/settings read on
      mount)
- [x] 3.2 `PlayerArea`: optional `onsettings`; `input: 'play' | 'inspect' | 'pick'`; `marked` tiles; `showWaits`
- [x] 3.3 Browser check `/play` and `/online` unchanged

## 4. Learn platform

- [x] 4.1 `src/lib/learn/registry.ts` (units, lessons with slug/titles/description/summary/related/descriptive/draft/
      updated), `glossary.ts`, `yaku.ts` skeletons
- [x] 4.2 Content components: `Tiles` (static figure with derived aria-label), `Callout` (incl. `ema` kind), `Term`,
      `ScoreTable` (generated from engine payment functions)
- [x] 4.3 `goals.ts` + `feedback.ts` for all exercise kinds (discard, pick, call, can-win, yaku, score with computed
      distractors, fu steps from `fuParts`, choice); unit tests + mutation check
- [x] 4.4 `Exercise.svelte` + `ExerciseSlice.svelte`: fixed-height card, SSR initial state, answer/feedback/try
      again/reveal, wired to `PlayerArea` / call buttons / answer buttons
- [x] 4.5 `progress.ts` (`riichi:learn`, try/catch, onMount); read-to-end via intersection observer
- [x] 4.6 `Cta.svelte` (guest vs signed in) + Learn layout: header with sticky Play button, breadcrumb, end-of-page
      CTA, prev/next/related
- [x] 4.7 Routes: `/learn` index (units, done marks, continue highlight), `/learn/[slug]` (glob-loaded lesson,
      404, draft handling), `/learn/yaku`, `/learn/glossary`
- [x] 4.8 `Seo.svelte`: title, description, canonical from `ORIGIN`, OG/Twitter, JSON-LD (Course, Article,
      BreadcrumbList, DefinedTermSet); generic OG image in `static/brand/`
- [x] 4.9 `/sitemap.xml` and `/robots.txt` from the registry (drafts excluded, private areas disallowed)
- [x] 4.10 Home page: Learn entry for every visitor
- [x] 4.11 "Play a bot now" target: settle the newcomer preset (open question) and link `/play?…`
- [x] 4.12 Tests: exercise validation, registry (uniqueness, order, kinds coverage, related), glossary links, yaku
      examples, SSR smoke render; mutation-check by planting broken lessons
- [x] 4.13 Check the Learn route bundle does not pull in bots, audio or `Table`

## 5. Unit 1: Basics (ship with the platform)

- [x] 5.1 How to play riichi mahjong (overview, winning hand first; hub linking the course)
- [x] 5.2 Tiles (suits with glosses, honors, simples/terminals/honors, red fives + EMA note, notation; pick exercises)
- [x] 5.3 Sets and a winning hand (completes-set picks, can-win on complete vs incomplete; seven pairs, kokushi)
- [x] 5.4 The table and a turn (descriptive or light: dora indicator pick, discard)
- [x] 5.5 Calling (call exercises, priority choice, open vs closed, no-yaku trap)
- [x] 5.6 Winning (tsumo/ron, yaku required; can-win exercises)
- [x] 5.7 Glossary entries for every term used so far; rules proofread of the unit

## 6. Unit 2: Reading your hand

- [x] 6.1 Tenpai and shanten (incl. "discard one tile to reach tenpai")
- [x] 6.2 Wait shapes (pick all waits per shape)
- [x] 6.3 Furiten (can-win with discard / temporary / riichi furiten; tsumo allowed)
- [x] 6.4 Glossary + proofread

## 7. Unit 3: Yaku

- [x] 7.1 Your first yaku (riichi, menzen tsumo, tanyao, yakuhai, pinfu; yaku exercises)
- [x] 7.2 Riichi in detail
- [x] 7.3 Dora (indicator wrap-around picks, kan/ura/red)
- [x] 7.4 More yaku (closed-only, open value)
- [x] 7.5 Yaku list page: all engine yaku and yakuman with example hands (tested)
- [x] 7.6 Glossary + proofread

## 8. Unit 4: Scoring

- [x] 8.1 Han and fu (base points, limits, dealer, ron vs tsumo, score table; score exercises)
- [x] 8.2 Counting fu (fu builder exercises; pinfu tsumo, chiitoitsu)
- [x] 8.3 Payments and draws (honba, riichi sticks, noten payments, dealer repeat, abortive draws + EMA note)
- [x] 8.4 Ending a game (east-only / east-south, placement, uma, bankruptcy)
- [x] 8.5 Glossary + proofread

## 9. Unit 5: Strategy

- [x] 9.1 Tile efficiency (max-ukeire discards, explained)
- [x] 9.2 When to call
- [x] 9.3 Basic defense (safe-against-riichi discards: genbutsu, suji, kabe; fold)
- [x] 9.4 Glossary + proofread

## 10. Verify and document

- [x] 10.1 Browser check on localhost with the dev launch configs: 360 px portrait (flick answers, no horizontal
      scroll, no layout shift), desktop (click), guest vs signed-in CTA, progress after reload, JS disabled shows
      the full article; stop the dev servers afterwards
- [ ] 10.2 Lighthouse (or equivalent) on a lesson: SEO and accessibility checks pass; validate JSON-LD
      → Lighthouse not run. Checked by hand: unique titles/descriptions (tested), canonical, OG/Twitter, one h1,
      JSON-LD parses (Article, BreadcrumbList, Course, DefinedTermSet).
- [x] 10.3 `npm test`, `npm run typecheck`, `npm run build --workspace @mahjong/web` green
- [x] 10.4 Docs: `web.md` (Learn layout, authoring a lesson, signup/login), `ui.md` (lesson pages as the
      minimal-text exception, exercise cues), AGENTS.md index if a new topic file is warranted
- [x] 10.5 Design system: add or note lesson layout, exercise card, CTA block, callout
      → Noted in docs/agents/ui.md (Learn pages); the design system artifact itself is not updated.
- [x] 10.6 Dead-code sweep: old `rig` copy, the `/login` toggle, unused props
