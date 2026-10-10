# Web app (apps/web): structure, server side, auth

Read when touching the SvelteKit app outside the play screen's look and feel: routes, game sources, offline saves,
auth, DB access, migrations, audio plumbing, the public Learn course and trainers. For the play screen's UI rules read [ui.md](ui.md).

## Layout

```
apps/web/               SvelteKit (Svelte 5 runes, adapter-node); imports @mahjong/engine and @mahjong/protocol
  src/lib/game/source.ts         GameSource: what the table needs (view, names, red, act, next)
  src/lib/game/local.svelte.ts   LocalGame: engine + bots in the browser (offline play, debug controls)
  src/lib/game/saved.ts          the offline game in localStorage (rules, seed, seat, settings, action log)
  src/lib/game/remote.svelte.ts  RemoteGame: same-origin /ws client, auto-reconnect (+ ping watchdog: a socket silent 3 s is replaced), takeover, deadline state
  src/lib/game/reload.ts         reloadForUpdate: reload for a new deploy, at most once a minute per tab (sessionStorage)
  src/lib/server/       db.ts (Kysely + pg pool), schema.ts (table types incl. rating/game tables), auth.ts, migrate.ts,
                        admin.ts (calls the game server's /internal API), game-server.ts (is the game server up? →
                        "Play online" on the home page), daily-discard.ts (the home page poll: the stored hand, voters, tally),
                        progress.ts (Learn progress and trainer stats on the account: get, events, merge; CATALOG)
  src/hooks.server.ts   init: run migrations, then load auth; handle: session → locals.user/session, /api/auth/*
  src/routes/           play (offline), online (lobby → queue → table; signed-in only; guests → /signup), login (sign in
                        only), signup, account (rating), healthz, admin (bot pool; 404 unless `user.role = 'admin'`),
                        learn (public course, see below), train (trainers, see below), daily-discard (POST a vote), api/progress
                        (the signed-in player's progress: GET, POST events or a merge), sitemap.xml, robots.txt, +error (site
                        error page, noindex), seo.test.ts (route SEO rules, see below)
  src/lib/learn/        the Learn course: registry.ts (units + lessons in order, SEO titles), lessons/<slug>/
                        (Lesson.svelte article + exercises.ts), components/ (ExerciseCard: one exercise, context-free;
                        Exercise: the lesson wrapper, plays its set's variants with progress; Tiles, T, Term, Callout, …),
                        feedback.ts (answer texts), glossary.ts, yaku.ts, context.ts (ExerciseSet),
                        progress.svelte.ts + progress-data.ts (course progress), lessons.test.ts (validates every lesson)
  src/lib/train/        trainers: registry.ts (trainers, levels, SEO, linked lessons), feed.ts, daily.ts, stats.svelte.ts
                        + stats-data.ts (trainer stats), components/ (Trainer, DiscardTable, RushBar, DailyDiscard)
  packages/drills/      (@mahjong/drills, shared with the game server; import `@mahjong/drills/<module>`):
                        types.ts, position.ts (lesson positions), goals.ts (engine-decided answers), safety.ts (safety
                        grades vs a riichi, lessons only), labels.ts (yaku/limit names), generate.ts (trainer problems),
                        selfplay.ts + rebuild.ts (bot games → lesson positions), daily-discard.ts; tests: generate.test.ts
                        (seed sweep), safety.test.ts, daily-discard.test.ts. Relative imports there carry `.ts`
                        (the game server runs it with Node type stripping)
  src/lib/progress/     progress for Learn and Train (see "Progress" below): events.ts (shapes, request parsing, apply,
                        merge; shared with the server), client.svelte.ts (the store), ProgressNudge.svelte
  src/lib/components/ContentShell.svelte   the frame of Learn and Train pages (header with both sections + CTA)
  src/lib/components/Band.svelte           a full-bleed section of a narrow page (see ui.md)
  migrations/           Kysely migrations (NNNN_name.ts, import only from kysely); bundled and run on server start;
                        0001_auth = Better Auth tables; 0002_game_server = rating, game, game_seat, game_action
                        (written by the game server); 0003_bot_players = bot, setting, user.role;
                        0004_bot_schedules = bot.schedule; 0005_daily_discard = daily_discard, daily_discard_vote;
                        0006_uuid_ids = every id column and reference becomes `uuid`; 0007_user_progress = user_progress;
                        0008_engine_version = game.engineVersion
  src/lib/tiles.ts      TILESETS (ratio, artwork margin, image paths); tileset.svelte.ts: the chosen one (`riichi:tileset`)
  src/lib/components/   Table (the whole play screen, takes a GameSource), Board (4 seat rows), Pond, Melds, PlayerArea
                        (hand/actions/magnifier), Tile, TimerBar, Countdown (online, after a deal),
                        ResultSheet / FinalSheet (hand and game results), SettingsSheet (+ LocalSettings for offline), BgPattern, FullscreenButton, Title
  src/lib/audio/        sounds.ts (the sound manifest: cue id → file or null), cues.ts (step events → cues, pure),
                        player.ts (Web Audio playback, sound settings, armSound)
  src/lib/assets/tiles/ FluffyStuff tile SVGs (CC0, "Classic"); slim/ = the author's 1:2 "Slim" set, generated by
                        apps/web/scripts/slim-tiles.mjs (don't hand-edit). Bundled via tiles.ts; warmed by tile-warmup.ts
  static/audio/         sound files named in sounds.ts (sources/licences in its README.md)
  static/brand/         "Riichi Arena" logo SVGs (text outlined, Bricolage Grotesque 800): icon.svg = the mark only,
                        for icons (icon-transparent = without the green square); logo-row / logo-column = mark +
                        wordmark, for larger graphics; wordmark = text only, everywhere else. `-on-light` variants
                        for light backgrounds
```

Analytics: Plausible (self-hosted at pla.vyref.com, domain riichiarena.com), loaded in `src/app.html`; it tracks
SvelteKit client navigations itself. Custom events: `window.plausible('Name', { props })`. Localhost visits are
ignored by Plausible, so dev doesn't pollute stats.

The web app owns the DB schema. When a migration changes a table the game server uses, update
`apps/game-server/src/db.ts` too (a hand-kept copy of `schema.ts`).

Ids are Postgres `uuid` columns (strings in TS): Better Auth runs with `generateId: 'uuid'` and the auth tables'
`gen_random_uuid()` defaults make them; the game server makes game and bot ids with `randomUUID()`. A malformed
value in a `uuid` column comparison is a Postgres error, so check ids from outside (paths, cookies, messages) with
`isUuid` from `@mahjong/protocol` first and treat a bad one as unknown. A credential `account.accountId` equals its
user id: Better Auth finds the password by both, so anything that rewrites user ids must rewrite it too.

## SEO (every public page)

Public pages are marketing: every route that robots.txt does not disallow must be strong for search.

- **`Seo`** (`lib/components/Seo.svelte`): title (`<page> · Riichi Arena`), description, canonical, Open Graph/Twitter,
  JSON-LD, optional `noindex`. Every public page renders it, in the page or in a component the page renders directly
  (`LessonBody`, `Trainer`). App pages (play, online, account, admin) use `Title`: a title plus default preview tags.
- **`lib/site.ts`**: `SITE_NAME` ("Riichi Arena", the one spelling in titles and metadata; the lowercase wordmark is
  only visual), the default description, the preview image and `siteOrganization` for JSON-LD.
- **`lib/seo.ts`**: `DISALLOW` (robots.txt), `sitemapPages` (sitemap.xml, from the registries) and `UNLISTED` (public
  pages left out of the sitemap, with the reason). A new page is listed, or unlisted with a reason, or disallowed.
- **`routes/seo.test.ts`** enforces this: a public page without `Seo` or a sitemap decision fails `npm test`, named by
  route. It reads sources one component level deep, so keep `Seo` in the page or the component it renders.
- Icons: `brand/icon.svg` plus PNG renders (`icon-48`, `icon-512`, `apple-touch-icon` with square corners) and
  `manifest.webmanifest`, linked in `app.html`. Re-render the PNGs if the mark changes (and copy them to `design-kit/`).

## Learn (public course)

Free, public, server-rendered lessons (marketing: they must rank in search and lead to sign-up). One concept per URL
(`/learn/<slug>`), plus `/learn/yaku` and `/learn/glossary`; `/sitemap.xml` is generated from the registry.

- **SSR, not prerendered**: the root layout resolves the session, and the call to action differs for signed-in
  players. The learn layout sets `contentPage` (no fullscreen toggle); each page sets its own meta via `Seo`.
- **Every page has the CTA** (`Cta.svelte`): guests "Sign up and play" (`/signup?next=/online`) + "Play a bot now"
  (`BEGINNER_PLAY`: weakest bots, full hints); signed in "Play online". It is in the header and at the end of pages.
- **Bite-sized parts**: a lesson is only `<Part title>` blocks, each a heading, short supporting text and exactly one
  `<Exercise>` (tested). The page shows one part at a time (`?step=n`, all parts in the HTML; without scripts all
  show). Keep part text short: what the exercise needs, applicable in a game right away.
- **Adding a lesson**: an entry in `registry.ts` (in teaching order; `draft: true` hides it in production), a folder
  `lessons/<slug>/` with `Lesson.svelte` (`<Part>`s with prose + `<Exercise id>`, `<Tiles t="123m 55z">`, `<T t="5p" />`,
  `<Term id>`: a glossary tooltip on first use in a part, `<Yaku id>`: the same for a yaku, from the yaku list,
  `<Callout kind="ema|tip|mistake">`) and `exercises.ts` (id → set). Every yaku named in lesson text needs `<Yaku>` (tested; a
  gloss in brackets right after it is covered). Then run the tests.
- **Answers come from the engine**: an exercise states a position (`scenario()` options, seat 0 = the reader;
  `discard: true` makes the seat on turn discard its drawn tile) and a goal; `goals.ts` computes what is right.
  Where the text states a result, add `expect` (verdict, yaku, score, fu) or `claim` (choice) or `only`
  (discard): `lessons.test.ts` checks it against the engine. It also checks that every exercise is answerable,
  placed exactly once, links and glossary terms exist, prompts have at most two sentences, and the yaku list examples
  score as listed. It has caught several wrong hand-made claims; trust it over mental arithmetic. It counts seat 0's
  hand as written: `scenario()` pads a short hand with junk, which silently changes it.
- **Strategy lessons** take *Riichi Book I* (Daina Chiba) as the reference: when a lesson disagrees with it, fix the
  lesson. Use it for concepts only, never its hands, problems or wording. Discard goals: `tenpai`, `min-shanten`,
  `max-ukeire`, `max-good-wait` (1-shanten draws that reach a wait of 5+ copies), `{ safest: seat }` (best
  `safety.ts` grade; `passed` in the position lists tiles let pass after the riichi) and `judgment`: a rule of
  thumb the engine can't decide alone (five blocks, keep a safe tile, value over wait). Its answers are `only`, and
  the test still requires each to keep the lowest shanten (unless `stepBack`). Use `judgment` only where the engine
  rates the choices equal or the rule is the point, and say the rule in `why`. Decision questions (riichi, push,
  call) are `choice` with a `claim` (`tenpai`, `goodWait`, `liveWaits`, `minRon`) so their facts are tested.
- A discard nobody can call does not open a call window and the game moves on; a "can you win?" ron that is not
  possible must therefore come from the right or across (from the left, seat 0 would draw). `buildPosition` throws
  otherwise.
- **Every exercise is a set of at least 3 variants** (`ExerciseSet`: complete exercises, played one after another in
  the card): the same idea, kind and (discard, pick) goal on different hands, so the idea gets practised, not solved
  once. Vary what can be pattern-matched (suit, where the answer sits, which option is right). Part text must hold
  for every variant; what is specific to one hand goes in its prompt or `why`. The first variant is the one in the
  server-rendered HTML. The test checks the set rules and validates each variant (`exercise <id> #<n>`).
- Standalone tile examples in text use pin or sou (circles and bamboo are easier to read than man's numerals);
  keep the tiles of the part's own figure or exercise when the text refers to them.
- Exercises show only the hand by default; add `show` flags for what the question needs (see ui.md).
- Lessons teach `DEFAULT_RULES` (what readers will play) and mark EMA tournament differences with
  `<Callout kind="ema">`.
- Progress (v2: solved variant indexes per exercise id; v1 ids upgrade to their first variant) is the reader's (see
  "Progress" below); `LessonBody` tracks its owner (read it reactively, not in a child's `onMount`). A set is solved when every variant was answered right (a reveal doesn't count); a lesson is completed
  when read to the end (the CTA scrolled into view) with every set solved. Shapes, parsing and changes live in
  `progress-data.ts` (tested); `progress.svelte.ts` wraps the shared store.

## Train (trainers)

Public drills next to the course: `/train` (hub), `/train/<id>` (efficiency, waits, yaku, score) and `/train/daily`.
Content pages like Learn (`contentPage`, `ContentShell`, `Seo`, CTA, sitemap from the registry).

- **A problem is `generate(trainer, level, seed)` → a Learn `Exercise`**: pure and seeded (engine RNG, never
  `Math.random`), so answers and feedback are the lessons' (`goals.ts`, `feedback.ts`) and the server and browser
  build the same problem. `?level=&p=<seed>` reproduces one (the page keeps the address on the shown problem).
- **Hands come from bot self-play** (`selfplay.ts`: the first hand of a game, bots without defense or blunders): the
  first moment that fits the trainer (a closed seat's turn at the level's shanten, a closed tenpai hand, a win) is
  **rebuilt** as a `Position` with that seat as seat 0 (`rebuild.ts`: winds, dealer, riichi, dora/ura, other seats'
  quads). Wins whose value a rebuild can't carry (ippatsu, haitei, rinshan, chankan, double riichi, …), yakuman and
  pao are skipped. Filters make each problem a decision (`generate.ts`); after 16 games they are dropped.
- **`generate.test.ts` sweeps seeds** per trainer and level: determinism, an engine answer, the filters and quotas,
  the budget, and that every rebuilt win scores exactly as the game paid it. Run it after engine, bot or rebuild
  changes; bot changes also change which problem a seed gives (shared links, past dailies), which is accepted.
- First problem: generated in `+page.server.ts` (in the HTML); the browser then makes the next one ahead (`feed.ts`).
  Generating takes ~10–70 ms (a bot game). The daily set is cached per UTC day per server process.
- Modes: Practice (retries, reveal; stats count first answers), Rush (3 min, 3 misses, levels climb every 5 solved;
  `ExerciseCard final`), Daily (5 fixed problems, final answers, a share line; Copy falls back to selecting the text
  outside secure contexts). Stats are the reader's (see "Progress" below), read on mount.
- **Player-facing copy never says how hands are made** (no "bots", no "real games"): bot players pass as human
  opponents elsewhere on the site. Say "hands" or "winning hands".
- **Adding a trainer**: a generator branch in `generate.ts` (+ `LEVELS`), an entry in `registry.ts`, sweep tests.
  Lessons listed in its `lessons` get a "Practice" link at their end.


## Progress (Learn and Train)

Kept **only on accounts**, a sign-up incentive (openspec account-only-progress). Nothing goes to browser storage.

- **Signed-in:** one `user_progress` row per user (`learn` and `train` JSONB documents, created on the first change).
  The store (`lib/progress/client.svelte.ts`) fetches `GET /api/progress` once per visit and sends each change as an
  event (`POST { events }`, at most 100). The server checks events against `CATALOG` (lessons, sets, variant counts,
  trainers, daily size; daily dates today or yesterday UTC) and refuses the whole request if one is unknown. It then
  applies them in order under a row lock, with the same reducers as the client. Failed sends stay queued for the next
  change, plus a `pagehide` keepalive.
- **Guests:** in memory only, for the visit. Client-side navigation keeps it; a reload loses it.
  `ProgressNudge` ("Not saved" + "Sign up to keep it", `/signup?next=<page>`) shows once a guest has progress.
- **Claiming:** sign-up and login finish with a client-side `goto`, so the visit survives. The next page that calls
  `trackOwner()` sees the owner change from guest to user and sends the visit as `POST { merge }`. Read and solved are
  unions, bests are the higher, answer counts are summed, and daily results are taken for days the account lacks.
  Sign-out clears memory.
- **Legacy keys** `riichi:learn` / `riichi:train` (before this change) are read once and removed. A user gets them
  merged into the account; a guest gets them in the visit.
- **Server-rendered HTML never depends on progress.** Every page that shows or records it calls `trackOwner()`.
  Until `progressLoaded()`, show nothing as done and no stats.
- Not progress, and still local: the offline game autosave, settings, and the daily discard vote (cookie).

## Daily discard (home page)

A poll, not a puzzle: one hand per UTC day for everyone (`dailyDiscard(date)`: an efficiency-trainer hand, with
round and dora shown, under a "Daily discard" heading and no prompt): discard any tile. **No right answer is shown and no stats before the vote**,
so nothing sways it: the home page load sends the tally only to voters, and `POST /daily-discard` answers a vote
with it. One vote per voter and day (the first stands): by `userId` (FK to `user`) when signed in, else by `guestId` from
the httpOnly `riichi_voter` cookie (set on the first guest vote); exactly one is set, and both are checked, so signing in after voting doesn't
reopen the ballot. Ballot stuffing by clearing cookies is possible and accepted (it's a fun poll, not a ranking).
The hand is stored in `daily_discard` (date, exercise, botShare): the game server's jobs store today's and tomorrow's
ahead, and the web stores it itself if it finds none (the hand is a pure function of the date, so both write the
same row). Stored, a day keeps its hand even after engine or bot changes, so its votes stay valid. **Bot players
vote too**, as real rows under their user id, cast by the game server (see game-server.md); the tally simply counts
every row. Like the trainers, the page never says some votes come from bots.
A vote from a page left open past midnight UTC gets 409 and the page reloads to the new hand.

## Offline autosave

Offline games autosave after every action (one slot, `saved.ts`) and resume by replaying the log: bare `/play`
resumes, `/play?…` starts a new game and then replaces the URL with `/play`; the home page shows Continue next to
New game. The save is cleared at game over; unreadable or non-replaying saves are dropped silently. A save
stores the engine's `ENGINE_VERSION` and is discarded under any other (bump rule: engine.md).

## Deploys and open pages

Open pages move to a new deploy by reloading when it costs nothing. `badVersion` from the game server reloads (then
`outdated`: a Reload button, if this tab already reloaded within a minute). A reconnect after a drop (every
game-server restart) checks `updated.check()` and reloads when a new web build is live; a plain network blip does not
reload. `kit.version.pollInterval` (5 min) makes the next navigation of any page a full load after a deploy. A
reload mid-game is safe: the server keeps the seat. `welcome.abortedGame` (a restart aborted the player's game, see
game-server.md → Recovery) shows "Game cancelled · unrated" in the lobby until they queue again.

## Gotchas

- **Phone testing over the LAN is plain HTTP (not a secure context):** `crypto.randomUUID`, `navigator.clipboard`,
  service workers etc. don't exist there. Use `crypto.getRandomValues` (`$lib/random.ts`) and guard secure-only APIs.
- Svelte 5: `let x: T | null = $state(null)` makes TS narrow `x` to `null` inside `$derived` closures — read it through
  an explicit type (`const p = x as T | null`).
- **Better Auth caches a schema mismatch** found when `betterAuth()` is created and never rechecks after our own
  migrations. That is why hooks.server.ts imports `$lib/server/auth` only after migrating in `init`; don't import it
  statically from modules loaded at startup. After a Better Auth upgrade, a startup "schema mismatch" log means: add a
  migration.
- Auth in dev: no `BETTER_AUTH_URL`/`ORIGIN` → base URL is derived per request, limited to localhost and private LAN
  hosts, over HTTP (non-Secure cookies), so phone testing works. Production requires `ORIGIN`.
- Kysely 0.29: `Migrator`/`Migration` come from `kysely/migration`, not `kysely`.
- No email server: no verification, password reset or email change. A forgotten password needs a manual DB fix.
