## 1. Manifest and player

- [x] 1.1 Create `apps/web/src/lib/audio/sounds.ts` with `SoundEntry`, the full `SOUNDS` cue list from design.md
      (`tilePlace: 'tile-place.mp3'`, everything else `null`) and `SoundId`
- [x] 1.2 Create `apps/web/src/lib/audio/player.ts`: lazy `AudioContext` unlocked on the first `pointerdown` /
      `keydown` (and resumed on `visibilitychange`), fetch + decode per cue with caching (failures cache as silent),
      prefetch of non-null cues once unlocked and enabled, `play(id, delay?)` with entry × user volume, 40 ms same-cue
      throttle, `setEnabled` / `setVolume`; all wrapped in try/catch, no-op without Web Audio or before unlock
- [x] 1.3 Tests for the player with a stubbed `AudioContext` / `fetch`: `play()` of a `null` cue makes no request
      and throws nothing; an all-`null` manifest plays a whole game silently; a 404 / undecodable file makes that cue
      silent, is fetched once only, and doesn't affect other cues; `play()` without Web Audio or before unlock is a
      no-op
- [x] 1.4 Add `apps/web/static/audio/README.md` listing each file with its source and licence (start with
      `tile-place.mp3`)

## 2. Event → cue mapping

- [x] 2.1 Create `apps/web/src/lib/audio/cues.ts`: pure `cuesFor(events, view, state)` implementing the mapping in
      design.md (discard / riichi / riichiAccepted / call / kanAttempt+kan dedupe / dora / handStart / own draw →
      tileDraw + yourTurn / handEnd graded by limit with delay / gameEnd first vs other / callAvailable per seq)
- [x] 2.2 Unit tests for `cuesFor` (vitest in apps/web, or engine-style helpers): opponent discard, riichi, pon,
      added kan with and without a robbing window, dora flip, tsumo vs ron vs double ron, yakuman / mangan / small
      win, exhaustive and abortive draws, own draw vs rinshan vs after call, call window with and without own options,
      gameEnd placement; build events from real engine games via `rig()` / `play()` where practical
- [x] 2.3 Mutation-check the tests (plant a wrong mapping, confirm a test fails)

## 3. Deliver events from the game sources

- [x] 3.1 Add `listen(fn): () => void` to `GameSource` (`source.ts`)
- [x] 3.2 `LocalGame`: notify listeners after each live `applyAction` with events redacted for the human seat; do not
      notify during the resume replay
- [x] 3.3 `RemoteGame`: notify on `update` with non-empty `events`; nothing on resync
- [x] 3.4 Offline debug autoplay / fast bot steps: confirm the throttle keeps it bearable (or skip cues at 0 delay)

## 4. Table, timer and lobby

- [x] 4.1 `Table.svelte`: subscribe via `game.listen`, run `cuesFor`, `play` each cue; unsubscribe on destroy and
      reset mapper state when the game object changes (new game / restart)
- [x] 4.2 Time warning: while `deadlineAt` is set, play `timeWarning` at 5..1 whole seconds remaining, once each
- [x] 4.3 Online page: play `matchFound` on `game.start` when the player was queued

## 5. Settings

- [x] 5.1 `riichi:sound` (default on) and `riichi:volume` (default 70) in `localStorage` with safe read/write; push
      values into the player on load and change
- [x] 5.2 `SettingsSheet`: sound checkbox + volume range input (volume disabled when sound is off)

## 6. Verify

- [x] 6.1 `npm run typecheck` and `npm test` pass
- [x] 6.2 In the browser pane (localhost): offline game plays `tilePlace` on discards from all seats; no burst when
      resuming a saved game; mute stops sound; no console errors with sound off or before the first click
- [x] 6.3 Update AGENTS.md (layout: `lib/audio/`, UI conventions: sounds come from redacted events + own view only,
      manifest is the place to add files) 
