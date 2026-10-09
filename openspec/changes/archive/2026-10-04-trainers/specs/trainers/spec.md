## ADDED Requirements

### Requirement: Train section
The site SHALL have a public Train section: a hub at `/train` listing every trainer with its per-device stats, one
page per trainer (`/train/efficiency`, `/train/waits`, `/train/yaku`, `/train/score`) and the daily set at
`/train/daily`. No account SHALL be needed. Pages SHALL be server-rendered with the first problem in the HTML (no
layout shift on hydration) and SHALL carry a unique title and description, a canonical URL, the site's sign-up call
to action, and entries in `sitemap.xml`. The home page SHALL link to the hub.

#### Scenario: First visit from search
- **WHEN** a guest opens `/train/efficiency` from a search result
- **THEN** the page shows a hand to discard from immediately, without signing in, and the call to action to sign up

#### Scenario: Crawled page
- **WHEN** a crawler fetches `/train/waits`
- **THEN** the HTML contains the page title, a short description of the drill and the first problem's tiles

### Requirement: Efficiency trainer
The efficiency trainer SHALL show a closed 14-tile hand and the dora indicator, and ask for the discard that keeps
the hand closest to winning with the most tiles that improve it (the Learn `max-ukeire` goal), counted against the
tiles the reader can see. The answer SHALL be given with the game's own discard input (flick up on touch, click with
a mouse). Every discard that is best by that measure SHALL be accepted. After the answer the trainer SHALL show a
table of every distinct discard, best first, with the shanten after it, its improving-tile count and the improving
tiles, with the reader's discard and the best discards marked. Levels SHALL be Easy, Normal and Hard: 1, 2 and
3 tiles from tenpai before the discard.

#### Scenario: Best discard
- **WHEN** the reader discards a tile that leaves the lowest shanten and the highest improving-tile count
- **THEN** it is marked right and the discard table shows it at the top

#### Scenario: Worse discard
- **WHEN** the reader discards a tile that keeps the lowest shanten but leaves 4 fewer improving tiles than the best
- **THEN** it is marked wrong, the feedback says how many tiles it lost, and the table marks both the reader's row
  and the best rows

#### Scenario: Tied discards
- **WHEN** two discards both leave the lowest shanten with the same, highest count
- **THEN** either is accepted

### Requirement: Waits trainer
The waits trainer SHALL show a tenpai hand of 13 tiles and ask the reader to pick every winning tile from the full
tile palette, as the Learn `waits` pick. Picking exactly the engine's waits SHALL be right; otherwise the feedback
SHALL say which picks are wrong and how many are missing, and after the answer every winning tile SHALL be shown.
Levels SHALL be Normal (hands from play) and One suit (single-suit hands with at least three winning kinds).

#### Scenario: Nobetan
- **WHEN** the hand is three complete sets plus 2345p
- **THEN** exactly {2p, 5p} is right

#### Scenario: Missing a wait
- **WHEN** the reader picks two of the three winning tiles and checks
- **THEN** the feedback says one is missing and the problem stays open (Practice)

### Requirement: Yaku trainer
The yaku trainer SHALL show a complete winning hand with how it was won (tsumo or ron, the winning tile marked) and
the round, seat and dora where they matter, and ask the reader to select every yaku it has from a list of the
hand's yaku plus distractors, as the Learn `yaku` exercise. Dora SHALL NOT be asked for. After the answer the han of
each yaku and the hand's total SHALL be shown.

#### Scenario: Two yaku
- **WHEN** the hand is won by tsumo, closed, without riichi, all simples, on a closed wait
- **THEN** exactly menzen tsumo and tanyao are right

### Requirement: Score trainer
The score trainer SHALL show a complete winning hand as the yaku trainer does and ask for its value in one of three
modes: han and fu (choose from options), points (choose from options; ron, or the tsumo payments), or the fu builder
(each fu part in turn, then the rounded total), reusing the Learn `score` and `fu` exercises.

#### Scenario: Points mode
- **WHEN** the mode is points and the hand is a non-dealer ron of 3 han 30 fu
- **THEN** 3900 is the right option

### Requirement: Practice mode
Practice SHALL be the default mode: untimed, a wrong answer explained and left open for another try, a reveal
offered, and a Next button after the problem is solved or revealed. A problem SHALL count as correct for stats and
the streak only when the first answer is right.

#### Scenario: Retry after a miss
- **WHEN** the reader's first answer is wrong and the second is right
- **THEN** the problem shows as solved, the streak resets to 0 and accuracy counts a miss

### Requirement: Rush mode
Rush SHALL give the reader 3 minutes to solve as many problems of one trainer as possible: each answer is final, a
wrong answer is a strike shown with its correct answer for a moment before the next problem, and three strikes or the
clock end the run. The level SHALL climb as the run goes on (where the trainer has levels). The run SHALL end with
the score and the device's best for that trainer. The clock, score and strikes SHALL be shown without text labels.

#### Scenario: Third strike
- **WHEN** the reader misses a third problem with time left
- **THEN** the run ends and shows the score and the best

#### Scenario: Climbing level
- **WHEN** a reader solves the first five efficiency problems of a run
- **THEN** the next problems are of a higher level

### Requirement: Daily set
The daily set SHALL be 5 problems the same for every visitor on a UTC day (two efficiency, one waits, one yaku, one
score), answered once each. At the end it SHALL show the result and a one-line text result (date and a mark per
problem) the reader can copy or share; the share SHALL work without secure-context-only APIs where they are
unavailable. Completed days and the daily streak SHALL be kept per device.

#### Scenario: Same set for everyone
- **WHEN** two visitors open `/train/daily` on the same UTC day
- **THEN** they get the same five problems in the same order

#### Scenario: Already played
- **WHEN** a reader who finished today's set opens it again
- **THEN** their result is shown instead of the problems

### Requirement: Shareable problems
Every problem SHALL have a URL that reproduces it exactly (trainer, level and seed). Opening it SHALL show that
problem first, then continue with new problems.

#### Scenario: Shared link
- **WHEN** a reader opens a problem link someone sent them
- **THEN** they see the same hand and the same right answers as the sender

### Requirement: Per-device stats
Each trainer SHALL keep on this device, without an account: problems answered, first-try correct, the current and
best streak, and the best Rush score. Stats SHALL be read on mount only (the server-rendered HTML never depends on
them) and storage errors SHALL be ignored.

#### Scenario: Private window
- **WHEN** storage is unavailable
- **THEN** the trainers work and simply keep no stats

### Requirement: Links with the course
Trainer pages SHALL link to the lesson that teaches their skill, and the lessons that teach a trained skill
(efficiency, waits, yaku, scoring) SHALL end with a link to the matching trainer.

#### Scenario: From a lesson
- **WHEN** a reader finishes the efficiency lesson
- **THEN** a "Practice" link opens the efficiency trainer
