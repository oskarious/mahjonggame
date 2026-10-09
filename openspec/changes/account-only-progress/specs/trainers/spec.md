## MODIFIED Requirements

### Requirement: Train section
The site SHALL have a public Train section: a hub at `/train` listing every trainer with the reader's stats, one
page per trainer (`/train/efficiency`, `/train/waits`, `/train/yaku`, `/train/score`) and the daily set at
`/train/daily`. No account SHALL be needed to train. Pages SHALL be server-rendered with the first problem in the
HTML (no layout shift on hydration) and SHALL carry a unique title and description, a canonical URL, the site's
sign-up call to action, and entries in `sitemap.xml`. The home page SHALL link to the hub.

#### Scenario: First visit from search
- **WHEN** a guest opens `/train/efficiency` from a search result
- **THEN** the page shows a hand to discard from immediately, without signing in, and the call to action to sign up

#### Scenario: Crawled page
- **WHEN** a crawler fetches `/train/waits`
- **THEN** the HTML contains the page title, a short description of the drill and the first problem's tiles

### Requirement: Rush mode
Rush SHALL give the reader 3 minutes to solve as many problems of one trainer as possible: each answer is final, a
wrong answer is a strike shown with its correct answer for a moment before the next problem, and three strikes or the
clock end the run. The level SHALL climb as the run goes on (where the trainer has levels). The run SHALL end with
the score and the reader's best for that trainer (the account's, or the guest's best this visit). The clock, score
and strikes SHALL be shown without text labels.

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
unavailable. Completed days and the daily streak SHALL be kept on the account; a guest keeps today's result for the
visit only.

#### Scenario: Same set for everyone
- **WHEN** two visitors open `/train/daily` on the same UTC day
- **THEN** they get the same five problems in the same order

#### Scenario: Already played
- **WHEN** a signed-in reader who finished today's set opens it again, on any device
- **THEN** their result is shown instead of the problems

#### Scenario: Guest after a reload
- **WHEN** a guest who finished today's set reloads `/train/daily`
- **THEN** the problems are shown again

## REMOVED Requirements

### Requirement: Per-device stats
**Reason**: Trainer stats are kept only on accounts. Guests keep them only for the visit, to give them a reason to
sign up.
**Migration**: See the `account-progress` capability. Existing `riichi:train` data is imported once and then removed.

## ADDED Requirements

### Requirement: Trainer stats
Each trainer SHALL keep in the reader's progress (the account, or the guest's visit): problems answered, first-try
correct, the current and best streak, and the best Rush score. Stats SHALL be read on mount only (the
server-rendered HTML never depends on them).

#### Scenario: Stats on another device
- **WHEN** a signed-in reader with a best streak of 12 in waits opens the `/train` hub on another device
- **THEN** the waits card shows the best streak of 12
