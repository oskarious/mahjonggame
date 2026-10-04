## Why

Riichi Arena needs a reason for new people to visit, and beginners searching "how to play riichi mahjong" are the
biggest audience. What ranks today is Wikipedia, a dense wiki, thin retailer pages and the outdated EMA 2016 PDF;
the interactive teaching lives inside gacha apps (Mahjong Soul, Riichi City). No free web course teaches from the
very first tile to scoring with exercises, none is built on the EMA 2025 rules, and none is made for a phone held in
one hand (see `research.md`). We already have a correct rules engine and a phone-first play screen, so we can publish
a complete, search-friendly course whose exercises are small slices of the real game, and turn readers into players
with a sign-up on every page.

## What Changes

- A public, server-rendered **Learn** section: `/learn` (the course), one page per concept (`/learn/<slug>`), a
  **yaku list** and a **glossary**. Each lesson page is a real article (headings, explanatory text, tile figures,
  tables) that search engines and link previews read in full, with interactive exercises embedded between sections.
  Not every section needs an exercise, but every lesson has at least one where the concept allows it.
- A **full curriculum**, from what the suits are called to scoring and basic strategy, in units: Basics (the game,
  tiles, sets, the table and turns, calling, winning), Reading your hand (tenpai, waits, furiten), Yaku (first yaku,
  riichi, dora, more yaku, the yaku list), Scoring (han and fu, counting fu, payments and draws, ending a game) and
  Strategy (efficiency, when to call, defense). Lessons teach the rules played on the site (EMA 2025 based) and point
  out where EMA tournament rules or other apps differ.
- **Exercises are slices of the game**, using the real hand strip, panel, ponds and call buttons with the game's own
  input: discard (e.g. "discard one tile to reach tenpai"), pick tiles (waits, dora, the tile that completes a set),
  answer a call, **"can you win?"** (yaku / furiten), pick the yaku in a hand, score a hand, and a step-by-step
  **fu builder**. Right answers come from the engine, and wrong answers get engine-computed explanations. Simple
  multiple-choice questions cover facts the engine cannot judge (e.g. "who can you chii from?").
- **SEO built in**: one concept per URL, unique titles and descriptions, a clean heading structure, canonical URLs,
  Open Graph and Twitter cards, structured data (Course, Article, BreadcrumbList), internal links (previous/next,
  related lessons, glossary terms), `sitemap.xml` and `robots.txt`, and fast pages with no layout shift.
- **A sign-up-and-play call to action on every lesson page**: "Sign up and play" (to the new sign-up page, then
  online play) for guests, "Play online" for signed-in players, and "Play a bot now" (offline, no account) as the
  secondary option.
- A dedicated **`/signup` page**. `/login` becomes sign-in only, and each page links to the other. The current
  in-page sign-in / sign-up toggle is removed.
- **Progress per device**: lessons read and exercises solved, stored in localStorage, with no account needed.
- Engine: the scripted-position builder used by the tests (`rig`) becomes a public, validated `scenario()` so
  exercises and tests build positions the same way.
- Small reuse refactors so play-screen components render outside the table and on the server.

## Capabilities

### New Capabilities

- `learn-section`: the public Learn pages: course index, lesson article layout, yaku list, glossary, server
  rendering and SEO, sitemap and robots, per-device progress, and the call to action on every page.
- `lesson-exercises`: interactive exercises embedded in lessons: kinds, engine-decided answers, feedback, the game
  slice they render, and the validation test.
- `lesson-curriculum`: what the course covers and in which order, the rules it teaches, and content rules
  (terminology, glossary links, EMA notes).
- `signup-page`: the dedicated sign-up page, and sign-in only on `/login`.
- `engine-scenarios`: a public engine API to build a game position from a compact description.

### Modified Capabilities

(none: there are no existing specs in `openspec/specs/`)

## Impact

- `packages/engine`: new `src/scenario.ts` (moved from `test/helpers.ts`) and its export. Scoring (`scoreHand`,
  `fuParts`, `limitFor`, payments) is already public and used as-is. No rule or replay changes.
- `apps/web`:
  - new `src/routes/learn/**`, `src/lib/learn/**` (lesson registry, lesson components, exercises, goal checks,
    progress)
  - new `src/routes/signup`; `src/routes/login` slimmed to sign-in only
  - `sitemap.xml` / `robots.txt` routes
  - a Learn entry on the home page
  - SSR-safety and small optional props on `PlayerArea`, `Tile`, `Pond`, `Melds`
  - tests for exercises and lessons
- No game server, protocol or database changes. Exercises run on local engine states only; online fair play is
  unaffected.
- Docs: `web.md` (Learn, signup), `ui.md` (lesson pages as the exception to minimal text; exercise cues), `engine.md`
  (`scenario()`). Design system: new components (lesson layout, exercise card, CTA block) are added there or noted
  as deviations.
- Content is most of the work: about 20 lessons plus the yaku list and glossary. Lessons can ship unit by unit,
  since the index and sitemap are generated from the lesson registry.
