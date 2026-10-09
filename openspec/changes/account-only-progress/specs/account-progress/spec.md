## ADDED Requirements

### Requirement: Progress kept only on accounts
Progress SHALL be stored only on a signed-in player's account, server-side: Learn progress (lessons read to the end,
solved exercise variants) and trainer stats (per-trainer stats, Rush bests, daily results). It SHALL NOT be written to
localStorage, sessionStorage, cookies or any other browser storage for anyone.

#### Scenario: Signed-in player on a second device
- **WHEN** a signed-in player who completed three lessons on their phone opens `/learn` on a laptop, signed in
- **THEN** those three lessons show as completed

#### Scenario: Nothing written to the browser
- **WHEN** a guest or a signed-in player solves an exercise and answers a trainer problem
- **THEN** no `riichi:learn` or `riichi:train` key (or any other progress key) is written to browser storage

### Requirement: Guest progress lasts one visit
A guest's progress SHALL be kept in memory only. It SHALL hold across client-side navigation within the site and be
lost on a full reload or when the tab is closed. Everything that shows progress (completion marks, solved sets,
stats, Rush best, daily result) SHALL work from it during the visit.

#### Scenario: Navigating within a visit
- **WHEN** a guest solves a set in one lesson and follows the link to the `/learn` index
- **THEN** the set and any lesson it completes show as done

#### Scenario: Reload
- **WHEN** a guest who finished two lessons reloads the page
- **THEN** no lesson shows as completed

### Requirement: Loading progress
Progress SHALL be read on mount only, so server-rendered HTML never depends on it. A signed-in player's progress
SHALL be fetched from the server at most once per visit and then kept in memory. Until it has loaded, nothing SHALL
show as completed and no stats SHALL be shown. If the fetch fails, the pages SHALL work and show no progress.

#### Scenario: Server-rendered lesson
- **WHEN** a signed-in player's lesson page is server-rendered
- **THEN** its HTML is the same as a guest's

#### Scenario: Server unreachable
- **WHEN** the progress fetch fails
- **THEN** lessons and trainers work normally and nothing shows as completed

### Requirement: Recording progress
Each change a signed-in player makes SHALL be sent to the server as an event: a lesson read, a variant solved, a
practice answer, a finished Rush, or a daily answer. The server SHALL apply events in order with the same rules the
client uses, so concurrent tabs don't overwrite each other. The server SHALL reject an event that names an unknown
lesson, exercise id, variant, trainer, or a daily date other than the current or previous UTC day. It SHALL ignore a
daily answer beyond the set's size, and reject requests without a session. Events that fail to send SHALL be kept and
sent again with the next event, for as long as the visit lasts.

#### Scenario: Two tabs
- **WHEN** a signed-in player answers efficiency problems in one tab and waits problems in another
- **THEN** the stored stats count every answer of both trainers

#### Scenario: Unknown exercise
- **WHEN** a client posts a solved variant for an exercise id the lesson doesn't have
- **THEN** the server rejects the request and stores nothing from it

#### Scenario: No session
- **WHEN** a request without a valid session posts events
- **THEN** the server answers 401 and stores nothing

### Requirement: Claiming visit progress
When a guest signs up or signs in, the progress made during that visit SHALL be merged into the account. Read
lessons and solved variants SHALL be unions, and Rush bests and best streaks SHALL be maximums. Answer counts SHALL
be added together. Daily results SHALL be kept for days the account doesn't have yet.

#### Scenario: Sign up after a streak
- **WHEN** a guest finishes two lessons and today's daily set, then signs up from the nudge
- **THEN** after sign-up the two lessons show as completed and today's daily result is shown

#### Scenario: Sign in to an existing account
- **WHEN** a guest solves a set the account had not solved, then signs in
- **THEN** the account has that set solved as well as all its earlier progress

### Requirement: Importing device progress
Progress stored by earlier versions of the site (`riichi:learn` v1 and v2, `riichi:train` v1) SHALL be read once.
For a signed-in player it SHALL be merged into the account. For a guest it SHALL be loaded into the visit, so a
sign-up in the same visit keeps it. After it is read, the keys SHALL be removed. Unreadable data SHALL be dropped.
Storage errors SHALL be ignored.

#### Scenario: Returning guest with old device progress
- **WHEN** a guest whose browser has `riichi:learn` with five completed lessons opens `/learn`
- **THEN** the five lessons show as completed for this visit, and the key is gone from localStorage

#### Scenario: Signed-in player with old device progress
- **WHEN** a signed-in player whose browser has `riichi:train` stats opens `/train`
- **THEN** the stats are merged into the account and the key is removed

### Requirement: Sign-up nudge for guests
Where a guest's progress shows, the page SHALL show a small visual cue that progress is kept only with an account.
It SHALL link to sign up with a return to the current page. The places are the `/learn` index, the `/train` hub, the
end of a lesson, the end of a Rush run and the daily result. It SHALL use minimal text and the design system, and
SHALL NOT be shown to signed-in players. The nudge SHALL NOT block or interrupt a lesson or drill.

#### Scenario: Guest finishes a Rush
- **WHEN** a guest's Rush run ends
- **THEN** the result shows the score and best with the nudge to sign up, which returns to the trainer after sign-up

#### Scenario: Signed-in player
- **WHEN** a signed-in player opens the `/train` hub
- **THEN** no nudge is shown
