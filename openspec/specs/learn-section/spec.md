# learn-section Specification

## Purpose
TBD - created by archiving change interactive-lessons. Update Purpose after archive.
## Requirements
### Requirement: Public, server-rendered pages
The site SHALL serve `/learn` (course index), `/learn/<slug>` (one lesson per concept), `/learn/yaku` (yaku list) and
`/learn/glossary` to anyone, without an account or login redirect. Every Learn page SHALL be server-rendered: the
HTML sent before any script runs SHALL contain the full article (headings, all explanatory text, tile figures as
images with text alternatives, tables, exercise prompts in their initial state). Unknown slugs SHALL answer 404.

#### Scenario: Signed-out visitor
- **WHEN** a visitor without a session opens `/learn/tenpai`
- **THEN** the lesson loads, its exercises are playable, and there is no redirect to the login page

#### Scenario: Crawlable content
- **WHEN** `/learn/tenpai` is fetched without running JavaScript
- **THEN** the HTML contains the lesson's `<h1>`, every section heading and paragraph, and each exercise's prompt and
  starting hand

#### Scenario: Unknown lesson
- **WHEN** a visitor opens `/learn/no-such-lesson`
- **THEN** the site answers 404

### Requirement: Search engine metadata
Every Learn page SHALL have a unique `<title>` and meta description written for the query it targets, exactly one
`<h1>`, section headings in order (`<h2>`, `<h3>`), a canonical URL on the production origin, Open Graph and Twitter
card tags (title, description, image, URL), and JSON-LD structured data: `Course` with its lessons on `/learn`,
`Article` (or `LearningResource`) plus `BreadcrumbList` on lesson pages. Text alternatives of tile figures SHALL name
the tiles in words (e.g. "1, 2 and 3 of characters").

#### Scenario: Lesson metadata
- **WHEN** the HTML of `/learn/furiten` is inspected
- **THEN** it has its own title and description, one `h1`, a canonical link, `og:title`/`og:description`/`og:image`,
  and valid `Article` and `BreadcrumbList` JSON-LD

#### Scenario: No duplicate titles
- **WHEN** the titles and descriptions of all Learn pages are compared
- **THEN** no two are equal

### Requirement: Page performance and stability
Learn pages SHALL render their text and figures without layout shift when scripts load, SHALL NOT load game code that
the page's exercises do not use before the reader reaches an exercise, and SHALL work at 360 px wide in portrait
without horizontal scrolling.

#### Scenario: Phone width
- **WHEN** any Learn page is shown 360 px wide
- **THEN** nothing scrolls horizontally and tile figures wrap or scale to fit

### Requirement: Course index
`/learn` SHALL present the course by unit in curriculum order, each lesson with its title, a one-line summary and,
on this device, whether it is completed; it SHALL highlight the first lesson not yet completed as the place to
continue, and link to the yaku list and glossary.

#### Scenario: Returning visitor
- **WHEN** a visitor who completed the first three lessons opens `/learn`
- **THEN** those three are marked completed and the fourth is highlighted

### Requirement: Lessons in bite-sized parts
A lesson SHALL consist only of parts, each with one heading, the short text that supports it and exactly one
exercise, so readers get one idea they can use in a game at a time. The page SHALL show one part at a time with a step
indicator (step n of m) and a "Next" button naming the next part; the selected part SHALL be in the URL (`?step=n`,
canonical URL without it). Every part SHALL be in the server-rendered HTML, and without scripts all parts SHALL show
as one article. The call to action, the next lesson and related lessons SHALL follow the last part.

#### Scenario: One part at a time
- **WHEN** a reader opens `/learn/how-to-play`
- **THEN** only the first part and its exercise show, with "Step 1 of 3" and a button "Next: A turn: draw one, discard
  one" that opens `?step=2`

#### Scenario: Structure enforced
- **WHEN** a lesson has text outside a part, or a part with no exercise or two
- **THEN** the lesson test fails

### Requirement: Lesson page layout
A lesson page SHALL show a breadcrumb (Learn › unit), the title, the current part, and after the last part links to
the previous and next lessons and to two or more related lessons. Terms defined in the glossary
SHALL, on first use in a lesson part, show their definition in a tooltip (on hover with a mouse, on tap on touch) that links
to the full glossary entry; in the server-rendered HTML the term SHALL be a link to that entry. Every yaku named in
lesson text SHALL likewise show a tooltip with its name, English name, value and rule, linking to its entry on the yaku
list. The layout SHALL follow the design system (tokens, type,
buttons) and be a single readable column on every screen width.

#### Scenario: Navigation
- **WHEN** a reader reaches the last part of "Tenpai"
- **THEN** they see links to the previous lesson, the next lesson and related lessons

#### Scenario: Glossary tooltip
- **WHEN** a reader taps (or hovers) the first "shanten" in a lesson part
- **THEN** a tooltip shows the term, its English gloss, its definition and a link to `/learn/glossary#shanten`, and
  stays on screen at 360 px wide

#### Scenario: Yaku tooltip
- **WHEN** a reader taps (or hovers) the first "all simples" in a lesson part
- **THEN** a tooltip shows Tanyao, All simples, 1 han and its rule, with a link to `/learn/yaku#tanyao`

#### Scenario: Glossary link without scripts
- **WHEN** the lesson HTML is read without JavaScript
- **THEN** the first "shanten" is a link to `/learn/glossary#shanten`

### Requirement: Call to action on every page
Every lesson page, the yaku list, the glossary and the index SHALL show a call to action to play on Riichi Arena:
- at the end of the article, a prominent block: for guests "Sign up and play" linking to `/signup?next=/online` plus
  "Play a bot now" linking to offline play (no account); for signed-in players "Play online" linking to `/online`
  plus "Play a bot";
- under every lesson part, a quiet row "Try it in a game" with the same two choices (the part's Next stays the
  primary button);
- and a compact "Play" button in the Learn header, visible while scrolling, linking to the same primary target.
The call to action SHALL be part of the server-rendered HTML.

#### Scenario: Guest finishes a lesson
- **WHEN** a signed-out reader reaches the end of any lesson
- **THEN** they see "Sign up and play" (to `/signup?next=/online`) and "Play a bot now"

#### Scenario: Signed-in player
- **WHEN** a signed-in player reads a lesson
- **THEN** the call to action says "Play online" and links to `/online`

#### Scenario: Sign-up returns to play
- **WHEN** a guest follows "Sign up and play" and creates an account
- **THEN** they land on `/online`

### Requirement: Yaku list page
`/learn/yaku` SHALL list every yaku the engine scores (including yakuman), grouped by value, each with its Japanese
name, English name, han closed and open (or "closed only"), a one-line rule and an example hand drawn with tiles.
Each entry SHALL have an anchor for linking. Example hands SHALL be checked by a test: scoring the example with the
engine yields that yaku.

#### Scenario: Example hands are correct
- **WHEN** the yaku list test runs
- **THEN** every example hand scores with its listed yaku and the listed han for closed and open

### Requirement: Glossary page
`/learn/glossary` SHALL define every term the lessons use (Japanese term, English gloss, one-sentence definition,
link to the lesson that teaches it), alphabetically with anchors.

#### Scenario: Every linked term exists
- **WHEN** the lesson test collects glossary links from all lessons
- **THEN** each one points to an existing glossary anchor

### Requirement: Progress on this device
Reading a lesson to the end and solving its exercises SHALL be recorded in localStorage (`riichi:learn`), keyed by
lesson slug and exercise id, with no account or server call. Storage errors SHALL be ignored (the pages work without
it). Progress SHALL be read only on the client, so server-rendered HTML never depends on it.

#### Scenario: Private window
- **WHEN** localStorage throws on access
- **THEN** lessons and exercises work normally and nothing shows as completed

### Requirement: Discoverable by search engines
The site SHALL serve `/robots.txt` and `/sitemap.xml`. The sitemap SHALL list the home page, `/learn`, every lesson,
the yaku list and the glossary, generated from the lesson registry, so a new lesson appears without editing the
sitemap by hand. `/admin`, `/account`, `/online` and the auth API SHALL be disallowed in robots.txt and left out of
the sitemap. The home page SHALL link to `/learn` for every visitor.

#### Scenario: New lesson added
- **WHEN** a lesson is added to the registry and the site is built
- **THEN** `/sitemap.xml` contains its URL and `/learn` lists it

### Requirement: Draft lessons
A registry entry marked `draft` SHALL be left out of the index, the sitemap and prev/next/related links, and SHALL
answer 404 in production builds (it stays viewable in dev), so the course can ship unit by unit.

#### Scenario: Unit not finished
- **WHEN** the Scoring lessons are marked draft and the site is built for production
- **THEN** `/learn` and `/sitemap.xml` do not list them and `/learn/counting-fu` answers 404

