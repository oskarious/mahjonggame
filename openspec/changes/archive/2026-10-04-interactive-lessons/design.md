## Context

`research.md` surveys the English resources:

- **Text guides** (mahjong.guide, ALBAN, retailer pages) give a consistent beginner order but have no exercises.
- **Reference** (riichi.wiki, Wikipedia) ranks well but doesn't teach in order.
- **Interactive teaching** is mostly inside gacha apps, or in single-skill web trainers.
- A few new web courses (riichimahjong.com, tenpai.gg, mahjong.school) target the same search queries.

Nobody combines a complete course, current EMA 2025 rules, exercises that *are* the game, and one-handed phone use.

What we have:

- **The engine.** It has everything the exercises need: notation (`parseTiles`), `waits`, shanten, `analyzeDiscards`
  (ukeire, per-discard waits, furiten), `legalActions`, `scoreHand` with `fuParts`, `limitFor`, `ronPoints` /
  `tsumoPoints`, and `viewFor`.
- **Play-screen components that take a `PlayerView`**: `PlayerArea` (own panel + hand strip with flick/click discard
  and magnifier), `Pond`, `Melds`, `Tile`. They have only run client-side so far (`/play` sets `ssr = false`).
- **`rig()` in the engine test helpers**, which builds exact positions.
- **A per-request session lookup** in the root `+layout.server.ts`.
- **A sign-up toggle inside `/login`** (`mode: 'in' | 'up'`).

## Goals / Non-Goals

**Goals:**

- Rank for beginner queries with one strong, server-rendered page per concept, and turn readers into players
  (a sign-up CTA on every page).
- Teach the whole path, from the names of the suits to scoring and basic defense, with exercises wherever a concept
  can be practised.
- Lessons that cannot silently teach something wrong: the engine decides the answers, and tests check every exercise,
  the yaku examples and the glossary links.
- Authoring that scales to about 20 long-form lessons: prose is comfortable to write, and exercises are typed data.

**Non-Goals:**

- Accounts-based progress, XP, streaks or leaderboards for lessons.
- Translations (English only; content kept separate from layout so i18n stays possible).
- A daily puzzle, a separate trainer, or replay analysis. These are good follow-ups that reuse the exercise
  components.
- Per-lesson rendered OG images (a generic card first).
- Analytics (none on the site yet). Measuring the funnel is a follow-up.

## Decisions

### 1. Article pages with embedded exercises, not a step carousel

The first draft used a one-step-at-a-time player. That hides most of the text from crawlers and from readers who
skim. Each lesson is now a normal article: `h1`, `h2` sections, paragraphs, tile figures, tables and callouts, with
exercise cards placed between sections.

Exercises are optional per section. They are required per lesson unless the lesson is marked `descriptive` (e.g. the
table and turn flow is mostly reading).

Lesson pages are the documented exception to the "minimal text" UI rule. Text is the product here. The exercise
slices themselves keep the game's visual language.

### 2. Authoring: a Svelte component per lesson plus typed exercise data

```
src/lib/learn/
  registry.ts                 units and lessons in order: slug, unit, title, seoTitle, description, summary,
                              related[], descriptive?; also the yaku list and glossary pages
  lessons/<slug>/Lesson.svelte   the article: prose + <Tiles>, <Callout>, <ScoreTable>, <Exercise id=…/>, <Term>
  lessons/<slug>/exercises.ts    Record<id, Exercise> (typed data, see §4)
  glossary.ts                 terms: id, term, gloss, definition, lesson slug
  yaku.ts                     yaku list entries: engine YakuId, names, han closed/open, rule, example hand
  components/                 Tiles (static figure), Callout, Term, Exercise, ExerciseSlice, LessonLayout, Cta, …
  goals.ts, feedback.ts       engine-side answer checks and feedback (pure)
  progress.ts                 localStorage
```

A Svelte file per lesson gives:

- prose in plain HTML
- components inline
- SSR for free
- type-checked props
- no Markdown pipeline to maintain

Exercises stay as data so tests can import and check them without rendering. `<Exercise id="…">` looks the data up in
the lesson's `exercises.ts`. The lesson test scans each `Lesson.svelte` source for `id="…"` to prove that every
placed exercise exists and every defined one is placed.

`<Term id="shanten">` renders the word and links it to the glossary on first use; `<Yaku id="tanyao">` does the same
for a yaku (value and rule from the yaku list, linking to `/learn/yaku#tanyao`). Both build on one tooltip component.
The test checks that all `Term` and `Yaku` ids exist, and that no yaku name appears in lesson text outside `<Yaku>`.

*Alternative considered: Markdown with mdsvex.* Nicer for prose, but it adds a preprocessor and a second component
syntax, and the content is component-heavy (tile figures every few lines). It could be revisited if non-developers
write lessons.

*Alternative considered: lessons fully as TS data* (the first draft). It's awkward for long prose and still needs
rich text rendering.

### 3. Routes, SSR and SEO

The routes:

- `src/routes/learn/+layout.svelte`: Learn header with a sticky compact "Play" CTA, breadcrumb, footer CTA.
- `learn/+page.svelte`: the course index.
- `learn/[slug]/+page.ts`: looks the slug up in the registry, `error(404)` when it's missing, and returns its metadata.
  It loads the `Lesson.svelte` / `exercises.ts` modules with `import.meta.glob` (eager for SSR, so the article is in
  the HTML).
- `learn/yaku`, `learn/glossary`: static routes that take precedence over `[slug]`.

Learn pages use SSR, unlike `/play`.

*Not prerendered:* the root `+layout.server.ts` resolves the session, and the CTA differs for signed-in players.
Prerendering would bake in the guest version. Rendering is cheap (one session lookup, no other DB access). If load
ever matters, cache guest responses at the proxy.

SEO pieces:

- **`Seo.svelte`** (`<svelte:head>`): title, description, canonical, OG/Twitter, JSON-LD.
  - `Course` + `hasPart` on `/learn`
  - `Article` + `BreadcrumbList` on lessons
  - `DefinedTermSet` on the glossary
- **Production origin** comes from `ORIGIN` (already required in production), falling back to the request origin in
  dev.
- **Titles** follow `<Concept>: <benefit> | Riichi Arena`, e.g. "Furiten in Riichi Mahjong: When You Can't Ron |
  Riichi Arena". A test checks uniqueness.
- **`src/routes/sitemap.xml/+server.ts` and `robots.txt/+server.ts`** are generated from the registry. `lastmod`
  comes from a `updated` date per registry entry.
- **Tile figures** are `<span role="img" aria-label="1, 2 and 3 of characters">` containing `Tile`s, and the label is
  derived from the notation.

### 4. Exercise model and engine-decided answers

```ts
type Exercise = { prompt: string; position: Position; show?: Show; why?: string } & (
  | { kind: 'discard'; goal: 'tenpai' | 'shanten-down' | 'max-ukeire' | { safeAgainst: Seat }; only?: string }
  | { kind: 'pick'; from: 'hand' | string; goal: 'waits' | 'dora' | 'completes-set' | { suit: Suit } | 'ukeire' }
  | { kind: 'call'; goal: { take: 'ron' | 'pon' | 'chii' | 'kan' } | 'pass' }
  | { kind: 'can-win' }                                  // answer: yes | no-yaku | furiten | not-complete
  | { kind: 'yaku' }                                     // options: engine yaku + plausible distractors
  | { kind: 'score'; ask: 'han' | 'han-fu' | 'points' | 'gain' } // options: right value + near misses
  | { kind: 'fu' }                                       // steps from scoreHand(...).fuParts
  | { kind: 'choice'; options: string[]; answer: number });
type Position = ScenarioOptions & { win?: { tile: string; by: 'tsumo' | 'ron'; from?: Seat }; discard?: {...} };
```

`goals.ts` has `answers(ex, state)`. `feedback.ts` has `feedback(ex, state, answer)`. Both are pure and engine-only:

- `can-win` uses `scoreHand` (null or no yaku → no-yaku), the furiten flags, and `isComplete`.
- `yaku` / `score` / `fu` use `scoreHand(ctx, DEFAULT_RULES)` and its `fuParts`.
- Points use `ronPoints` / `tsumoPoints`.
- Distractors for `score` are computed: ±1 han, the wrong fu rounding, dealer/non-dealer swapped. They're never
  authored.

The `fu` builder walks the `fuParts` list and offers 2–3 values per part. A wrong pick explains the rule for that part.

Rules come from `DEFAULT_RULES` (what readers will play). Where `EMA_2025` differs, a `<Callout kind="ema">` says so.
Tests can assert the difference with both presets where an exercise depends on it.

### 5. The slice: reusing play-screen components

`ExerciseSlice.svelte` renders from `viewFor(state, 0, { hints })`:

- the requested opponents' ponds/melds and riichi markers, in board seat order (right, across, left)
- then `PlayerArea`

The hand is not mutated on a wrong discard. A correct one shows the tile raised in the own pond for a beat.

Generic props added to `PlayerArea` (no lesson-specific branches):

- `onsettings` optional (no cog)
- `input: 'play' | 'inspect' | 'pick'`
- `marked` tiles for revealed / correct answers (the green dot keeps its meaning, "suggested")
- `showWaits` to hide magnifier waits on wait quizzes

`can-win` / `yaku` / `score` / `fu` / `choice` show the hand (plus melds and win tile) read-only, with answer buttons
in the exercise card.

SSR: `PlayerArea`, `Tile`, `Pond`, `Melds` must render on the server, so browser-only reads move to `onMount` /
effects. The server render is the initial position (static), and the card has a fixed height for prompt, feedback
and buttons, so hydration causes no shift.

Game code size: an exercise only needs the engine and these components. The heavy parts (bots, audio, `Table`) must
not be imported by Learn routes. Check this in the build output.

### 6. CTA and the sign-up page

`Cta.svelte` reads `page.data.user` (from the root layout):

- **Guest:** primary "Sign up and play" → `/signup?next=/online`, secondary "Play a bot now" → `/play` with the
  beginner preset.
- **Signed in:** "Play online" → `/online` + "Play a bot".

It appears in a block at the end of every Learn page, in a compact sticky header button, and once mid-article on long
lessons (after the first exercise). It isn't a popup.

The `/online` route is signed-in only, so `next=/online` after sign-up drops new players straight into the lobby.

`/signup` is a new route with the sign-up half of today's `/login` form: username rules from `@mahjong/protocol` and
the existing auth-error mapping, plus `safeNext`. Its `+page.server.ts` redirects signed-in users. `/login` keeps
only sign-in, and the toggle state and its CSS are deleted. Links:

- home "Sign in" chip + a new "Sign up" link
- the guest online entry → `/signup`
- each auth page links to the other with `next` kept

### 7. Progress

`progress.ts` stores `{ v: 1, lessons: { [slug]: { read?: true, solved: string[] } } }` under `riichi:learn`. Every
access is in try/catch and is read in `onMount`. A lesson is "completed" when read to the end (an intersection
observer on the CTA block) and all its exercises are solved.

### 8. Tests

`apps/web/src/lib/learn/*.test.ts` (vitest, part of `npm test`):

- **Exercise validation:** per the spec.
- **Registry:**
  - unique slugs / titles / descriptions
  - order matches the curriculum
  - every non-descriptive lesson has an exercise
  - every exercise kind is used
  - related slugs exist
- **Glossary links** exist.
- **Yaku examples:** each scores with its yaku and han, closed and open.
- **`goals` / `feedback` unit tests**, with a mutation check per the repo rule.
- **SSR smoke test:** render a lesson page with `svelte/server` and assert that the `h1`, the section text and an
  exercise prompt are in the HTML.

## Risks / Trade-offs

- **[Content volume: about 20 long lessons is the bulk of the work]** → Build the platform with Unit 1 first and
  publish units as they're done. The registry, index and sitemap only list published lessons (`draft` flag).
- **[Prose drifts from the engine, e.g. text says "waits on 3p and 6p" next to a hand that also waits on 9p]** →
  Figures and exercises are rendered from notation. Write text about *the* figure, keep numbers in exercise
  feedback (engine-generated), and do a rules proofread task per unit.
- **[SSR of components written for client-only play]** → They're made SSR-safe in this change. If one stays too
  entangled, the slice renders a static `Tiles` figure on the server and swaps to `PlayerArea` on mount (same size
  box).
- **[Competing sites already target the same queries]** → Our differentiators are current EMA 2025, exercises that are
  the real game, and phone-first. Titles and descriptions say so. The yaku list and glossary are linkable reference
  pages that collect links over time.
- **[Signed-in vs guest SSR differences could confuse caches]** → No shared caching of Learn pages for now. If added,
  cache only cookie-less requests.
- **[The `/login` split breaks bookmarks to the sign-up tab]** → The tab had no URL of its own, so there are no
  bookmarks to break.

## Migration Plan

Additive except the `/login` split, which is user-visible but has no data impact. No DB, protocol or save-format
changes. Ship platform + Unit 1 + sign-up page first, then units 2–5. Rollback = revert.

## Open Questions

- The "Play a bot now" preset for newcomers: probably the lowest skill, with hints at "full" for the first game.
- Should the course name and URL include "riichi mahjong" (`/learn/riichi-mahjong/<slug>`) for keyword weight? The
  proposal uses `/learn/<slug>` with keywords in slugs and titles. Changing it later needs redirects, so decide
  before launch.
- Whether to submit the sitemap to Google Search Console / Bing at launch (an ops task outside the code).

## Implementation notes (where the build differs from the plan above)

- **PlayerArea props**: only `onsettings` (optional), `marked` and `showWaits` were added. No input-mode prop: a view
  without actions is read-only, and pick exercises use a tile palette inside the exercise card.
- **Text claims are tested too**: exercises can state what the text relies on (`expect` for can-win verdicts, yaku,
  score and fu; `claim` for choice questions about a hand; `only` for discards) and `lessons.test.ts` checks it
  against the engine. While writing the course this caught several wrong hand-made claims.
- **Call windows**: a discard nobody can claim does not open a window, so `buildPosition` keeps seat 0's furiten
  flags as they were at the discard and rejects ron positions from the left that would make seat 0 draw.
  `declareWin` passes for other seats that could also call before reading the result.
- **SSR smoke test** is a curl check of the HTML (the web vitest config has no Svelte plugin).
- **`contentPage`** (learn layout data) replaces the root layout's default link-preview tags and hides the
  fullscreen toggle.
- **Tile sizing** in Learn uses a viewport-based `--col` variable, not `cqw` (see ui.md).
- **Open question resolved**: "Play a bot now" starts an East-only game against the weakest bot preset with full
  hints (`BEGINNER_PLAY`).
- **Bite-sized parts (changes decision 1)**: a lesson is a series of parts, each one heading, short text and exactly
  one exercise, shown one at a time (`?step=n`). All parts stay in the server-rendered HTML of the one lesson URL, so
  search engines still see one complete page per topic; without scripts every part shows. Chosen over one URL per
  part to avoid splitting each search topic into thin pages.
