## Why

The table is silent. Sound is how existing clients (Tenhou, Mahjong Soul, Riichi City) let a player follow the game
without staring at it: a click for every discard, a distinct cue for calls, riichi and wins, a nudge when it is your
turn and a tick when your time is running out. A `tile-place.mp3` already exists in `apps/web/static/audio/` but
nothing plays it. Rather than wiring single files ad hoc, we want one manifest that names every cue the game can
make, so sounds can be added later by dropping in a file and filling in a name.

## What Changes

- A **sound manifest** (`apps/web/src/lib/audio/sounds.ts`): an object mapping a fixed set of cue ids to files in
  `static/audio/`, e.g. `{ tilePlace: 'tile-place.mp3', callRiichi: null, ... }`. `null` = no file yet, the cue is
  silent. The full cue list is defined now, modelled on what Tenhou / Mahjong Soul play, with generic sounds (chimes,
  clicks, stings) where those games use character voice lines. Only `tilePlace` has a file today.
- A small **sound player** (Web Audio): loads files lazily, unlocks on the first user gesture (autoplay policy, iOS),
  plays with per-cue volume, throttles repeats, never throws into the game.
- **Event → cue mapping**: the table plays cues from the (already redacted) game events of both local and online
  games — discards, riichi, calls, kans, dora flips, hand start, wins (graded by value), draws, game end — plus
  own-seat cues from the view: your turn, a call is available to you, time running out.
- `GameSource` gains a way to deliver each step's events to the table (online games already receive them in
  `update`; offline games currently drop them).
- **Settings**: sound on/off and a volume slider in the settings sheet, stored per device in `localStorage`.
- No sounds on resume/resync (replaying an offline save or reconnecting online must not play a burst of cues).

## Capabilities

### New Capabilities
- `game-sounds`: the cue list and manifest, which game moments play which cue, playback rules (unlock, throttling,
  silence on resume), the fair-play constraint that sounds only use what the seat may see, and the sound settings.

### Modified Capabilities
<!-- none: no existing spec in openspec/specs covers the table screen -->

## Impact

- `apps/web/src/lib/audio/` (new): `sounds.ts` (manifest), `player.ts` (Web Audio), `cues.ts` (events/view → cues).
- `apps/web/src/lib/game/source.ts`, `local.svelte.ts`, `remote.svelte.ts`: deliver per-step events.
- `apps/web/src/lib/components/Table.svelte`, `SettingsSheet.svelte`, `TimerBar.svelte` (time warning).
- `apps/web/static/audio/`: sound files (only `tile-place.mp3` for now; licences to be noted per file).
- No engine, protocol or game-server changes: online `update` messages already carry redacted events.
