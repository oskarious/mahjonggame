## ADDED Requirements

### Requirement: Sound manifest defines every cue
The web client SHALL have one manifest (`apps/web/src/lib/audio/sounds.ts`) that maps every sound cue id to either a
file in `static/audio/` (a file name, or `{ file, volume }`) or `null`. The set of cue ids SHALL be a fixed,
typed list covering tiles, calls, own-seat prompts, hand and game results and online matchmaking (see design). A cue
mapped to `null` SHALL be silent without errors. Adding a sound SHALL need nothing but the file and its manifest entry.

#### Scenario: Cue without a file
- **WHEN** a game moment maps to a cue whose manifest entry is `null`
- **THEN** nothing is played, no request is made, and no error is thrown, logged or shown

#### Scenario: No sounds defined at all
- **WHEN** every manifest entry is `null` (or the audio folder is empty)
- **THEN** games play normally with no errors, warnings or network requests for audio

#### Scenario: Existing tile sound
- **WHEN** the manifest is loaded
- **THEN** `tilePlace` maps to `tile-place.mp3` and every other cue id is present (with a file or `null`)

#### Scenario: Missing or undecodable file
- **WHEN** a manifest entry names a file that fails to load or decode
- **THEN** that cue is silent, the game continues, other cues still play, and the file is not requested again

### Requirement: Game events play cues
The table SHALL play cues for the events of each game step, in local and online games alike:
a discard plays `tilePlace`; a riichi discard also plays `callRiichi`, and the accepted riichi plays `riichiStick`;
a chii, pon or open kan plays `callChii` / `callPon` / `callKan` and `meldPlace`; a closed or added kan plays
`callKan` once per declaration (also when a robbing-the-kan window comes first); a newly revealed dora indicator
plays `doraFlip`; a new hand plays `handStart`; a win plays `callRon` or `callTsumo` followed by `winHand`,
`winLimit` (mangan up to sanbaiman) or `winYakuman` by the highest winning hand's limit; an exhaustive draw plays
`drawExhaustive`, an abortive draw `drawAbortive`; the end of the game plays `gameEndFirst` when the player placed
first, else `gameEnd`. Cues SHALL play for every seat's public actions, not only the player's own.

#### Scenario: Opponent discards
- **WHEN** another seat discards a tile
- **THEN** `tilePlace` plays

#### Scenario: Riichi
- **WHEN** a seat declares riichi and the riichi is accepted
- **THEN** `tilePlace` and `callRiichi` play on the discard, and `riichiStick` plays on acceptance

#### Scenario: Pon
- **WHEN** a seat calls pon
- **THEN** `callPon` and `meldPlace` play

#### Scenario: Added kan with a robbing window
- **WHEN** a seat declares an added kan, a robbing-the-kan window opens and then everyone passes
- **THEN** `callKan` plays once, when the kan is declared, and `doraFlip` plays when the new indicator is revealed

#### Scenario: Yakuman ron
- **WHEN** a hand ends with a ron worth a yakuman
- **THEN** `callRon` plays, followed by `winYakuman`

#### Scenario: Double ron
- **WHEN** two seats win on the same discard
- **THEN** `callRon` plays once and the result cue follows the higher-valued win

### Requirement: Own-seat prompts
The table SHALL play `yourTurn` when the player's own turn starts after another seat acted (not after the player's
own call), `callAvailable` when a call window opens in which the player has call options, and `timeWarning` once
per second during the last 5 seconds of the player's own decision deadline (online only).

#### Scenario: Turn comes around
- **WHEN** the seat on the player's left discards, nobody calls, and the player draws
- **THEN** `yourTurn` plays

#### Scenario: Own call does not prompt
- **WHEN** the player calls pon and must now discard
- **THEN** `yourTurn` does not play

#### Scenario: Time running out
- **WHEN** the player's online deadline has 5 seconds left and the player has not acted
- **THEN** `timeWarning` plays at 5, 4, 3, 2 and 1 seconds remaining and stops when the player acts

### Requirement: Match found
The online page SHALL play `matchFound` when a queued player is seated in a new game.

#### Scenario: Leaving the queue for a table
- **WHEN** the server sends `game.start` to a player waiting in the queue
- **THEN** `matchFound` plays

### Requirement: Sounds reveal nothing hidden
Cues SHALL be derived only from events redacted for the player's seat and from the player's own view. No cue, and
no cue's timing, SHALL depend on another seat's concealed tiles, draws, call options or call responses.

#### Scenario: Opponent draws
- **WHEN** another seat draws a tile
- **THEN** no cue identifies the drawn tile (a draw cue, if any, is the same for every tile)

#### Scenario: Someone else can call
- **WHEN** a call window opens in which only another seat has options
- **THEN** `callAvailable` does not play and no other cue plays until a public event happens

### Requirement: No bursts on resume or resync
The table SHALL play cues only for steps applied after it is shown. Resuming a saved offline game (replaying its
log) and resyncing an online game (reconnect, `update` without events) SHALL NOT play cues for the replayed history.

#### Scenario: Resume an offline game
- **WHEN** the player opens `/play` and a saved game with 200 actions is replayed
- **THEN** no cue plays until the next action

#### Scenario: Reconnect online
- **WHEN** the client reconnects and receives an `update` with an empty event list
- **THEN** no cue plays

### Requirement: Playback never disturbs play
Playback SHALL NOT throw into the game or block it. Audio SHALL start after the first user gesture on the page
(browser autoplay policy, including iOS Safari) and SHALL work over plain HTTP (LAN testing). The same cue played
again within 40 ms SHALL be dropped (fast bot play, fast-forwarded games).

#### Scenario: No gesture yet
- **WHEN** events arrive before the player has touched or clicked the page
- **THEN** those cues are skipped silently and later cues play once the page has been touched

#### Scenario: Audio unavailable
- **WHEN** the browser has no Web Audio support or creating the audio context fails
- **THEN** the game plays normally without sound and no error is shown

### Requirement: Sound settings
The settings sheet SHALL have a sound toggle and a volume slider. Both SHALL be stored per device in `localStorage`
and apply to local and online games. Sound SHALL be on by default. When sound is off, no files SHALL be downloaded.

#### Scenario: Mute
- **WHEN** the player turns sound off in the settings sheet
- **THEN** no cue plays, in this and later games, until sound is turned on again

#### Scenario: Storage blocked
- **WHEN** `localStorage` throws
- **THEN** sound uses the defaults and the setting still works for the current page
