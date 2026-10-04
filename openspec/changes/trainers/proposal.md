## Why

Lessons teach a concept once; getting good needs repetition. Players already go elsewhere for it: the community's
"start here" path ends with an efficiency trainer and scoring practice. The apps (Riichi City, Mahjong Soul) offer
post-game AI review, not drills; the web trainers each drill one skill, mostly on random hands, often reveal-only,
and none has chess.com-style progression (see `research.md`). We already have everything that makes a trainer correct and explainable: the engine decides
answers, `goals.ts` / `feedback.ts` explain them, and the Learn exercise card is the game's own hand strip. Endless,
generated drills turn that into a reason to come back daily, and a search entry point ("riichi efficiency trainer")
next to the course.

## What Changes

- A public **Train** section: `/train` (the trainers) and one page per trainer, server-rendered with the first problem
  in the HTML, then endless problems in the browser. No account needed.
- Four trainers at launch, each an endless stream of **generated problems** with engine-decided answers:
  - **Efficiency** ("what do you discard?"): a 14-tile hand, discard for the most tiles that improve it. After the
    answer, a table of every discard with its shanten, ukeire count and tiles, the reader's choice and the best
    marked: the "why" other trainers lack.
  - **Waits**: a tenpai hand, pick every winning tile. A "one suit" level drills the many-sided waits.
  - **Yaku**: a winning hand, pick every yaku it has.
  - **Score**: a winning hand, choose its han and fu, or its points, or build its fu step by step.
- **Realistic hands**: problems come from bot self-play (the hand a player actually holds at that point), filtered so
  each problem is a real decision, not an isolated honor to throw.
- **Deterministic and shareable**: a problem is `(trainer, level, seed)`; its URL replays it exactly.
- **Three ways to play**: Practice (untimed, retry, reveal, full explanation), **Rush** (as many as you can in
  3 minutes, three misses end it) and a **Daily** set (the same 5 problems for everyone that day, a shareable result
  line), with streaks and per-device bests. A rated puzzle mode (chess.com style) is a follow-up the seeds keep open.
- **Per-device stats** (solved, accuracy, best streak, best rush) in localStorage, like Learn progress.
- **Links both ways**: lessons end with "Practice this" into the matching trainer; trainer pages link to the lesson
  that teaches the skill; the home page gets a Train entry. Every trainer page carries the sign-up CTA.
- **Refactor**: the Learn exercise card is split into a context-free card (exercise + state in, result out) used by
  lessons and trainers, so both share one input, feedback and look.

## Capabilities

### New Capabilities

- `trainers`: the Train section: hub and trainer pages, the four trainers, Practice and Rush modes, per-device stats,
  SSR and SEO, links with lessons and the home page.
- `trainer-problems`: problem generation: seeded and deterministic, from bot self-play or targeted shapes, levels,
  the "real decision" filters, and the test that sweeps seeds against the engine.

### Modified Capabilities

(none: there are no archived specs in `openspec/specs/`; the Learn exercise card refactor keeps lesson behaviour)

## Impact

- `apps/web`:
  - new `src/routes/train/**` and `src/lib/train/**` (generators, trainer definitions, rush/streak state, stats,
    efficiency table component)
  - `src/lib/learn/components/Exercise.svelte` split into a reusable card plus the lesson wrapper (progress, ids);
    `goals.ts` / `feedback.ts` reused unchanged where possible
  - home page Train entry, "Practice this" link at the end of matching lessons, `sitemap.xml` entries
- `packages/engine`: no rule changes. Generators use the public API (`createGame`, `applyAction`, `botAction`,
  `pendingSeats`, `scenario`, the seeded RNG). No `SAVE_VERSION` bump.
- No game server, protocol or database changes. Trainers run on local engine states only; online fair play is
  unaffected (a trainer never sees a live game).
- Docs: `web.md` (Train section), `ui.md` (trainer screen, efficiency table), design system (trainer card, rush
  header, efficiency table) or a noted deviation.
