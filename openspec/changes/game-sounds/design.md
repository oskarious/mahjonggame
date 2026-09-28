## Context

The client has no audio at all. `apps/web/static/audio/tile-place.mp3` was added as the first sound. Both game
sources already produce per-step events: `RemoteGame` receives redacted `GameEvent[]` in every `update` message
(and ignores them), `LocalGame` gets `{ state, events }` from `applyAction` (and drops the events). The table
(`Table.svelte`) only sees `game.view`.

What existing clients play (from playing them; neither publishes a sound list):

- **Tenhou**: tile click on every discard, a distinct sound for riichi, calls announced by voice (pon / chii / kan /
  riichi / ron / tsumo, optional), a sound when a win or draw ends the hand, a countdown near the time limit.
  Very little else: no draw sound, no music by default.
- **Mahjong Soul**: character voice lines for every call, riichi, ron / tsumo, tenpai / noten at a draw, plus
  effects: tile placement, riichi flash + stick, dora flip, win "cut-in" graded by value (normal / mangan+ /
  yakuman), score counting, placement fanfare at game end, countdown ticks, match-found jingle, UI clicks, BGM.
- **Riichi City / Mahjong Soul style clients** add ambient BGM per room and escalating riichi music.

We keep the moments and replace voice lines with short generic cues (a chime or wood-block "stinger" per call type,
distinct enough to tell pon from chii without looking). No BGM, no UI click sounds, no score counting (fluff).

## Goals / Non-Goals

**Goals:**
- One typed manifest: cue id → file (or `null`). The full cue list exists now; files come later.
- Play cues for local and online games from the same code, driven by redacted events + own view.
- Reveal nothing hidden; no sound bursts on resume/resync; never break play.
- Mute + volume in settings.

**Non-Goals:**
- Background music, voice lines, per-character packs, UI click sounds, score-counting ticks.
- Sound themes / user-selectable packs (the manifest shape allows it later).
- Haptics (vibration) — a possible follow-up using the same cue mapping.

## Decisions

### Cue list (the manifest)

`apps/web/src/lib/audio/sounds.ts`:

```ts
export type SoundEntry = string | { file: string; volume?: number } | null;

export const SOUNDS = {
  // Tiles
  tilePlace: 'tile-place.mp3', // any discard
  tileDraw: null,              // own draw (soft; Tenhou/MS are silent or near-silent here)
  meldPlace: null,             // called tiles slide into the meld area
  riichiStick: null,           // 1000-point stick put down (riichi accepted)
  doraFlip: null,              // a new dora indicator is turned over

  // Calls (generic stingers instead of voice lines)
  callChii: null,
  callPon: null,
  callKan: null,
  callRiichi: null,
  callRon: null,
  callTsumo: null,

  // Own seat
  yourTurn: null,              // own turn starts after someone else acted
  callAvailable: null,         // a call window with options for you opened
  timeWarning: null,           // tick, last 5 s of your deadline (online)

  // Hand and game
  handStart: null,             // shuffle / wall build
  winHand: null,               // below mangan
  winLimit: null,              // mangan .. sanbaiman
  winYakuman: null,
  drawExhaustive: null,        // ryuukyoku
  drawAbortive: null,
  gameEndFirst: null,          // final standings, you placed first
  gameEnd: null,               // final standings, otherwise

  // Online
  matchFound: null,            // seated from the queue
} satisfies Record<string, SoundEntry>;

export type SoundId = keyof typeof SOUNDS;
```

Paths are relative to `/audio/`. `volume` (0..1, default 1) balances files against each other; the user volume
multiplies it. Alternative considered: fallbacks (e.g. `callPon` → a generic `call`) — rejected for now, a `null`
entry is simpler and the list is short enough to fill completely.

### Delivering events: `GameSource.listen`

Add to `GameSource`:

```ts
/** Called with each applied step's events, redacted for the own seat. Not called for replayed history. */
listen(fn: (events: GameEvent[], view: PlayerView) => void): () => void;
```

- `LocalGame`: after each live `applyAction`, call listeners with `events.map(e => redactEvent(e, human))`
  (redacted even offline, so the mapping code sees exactly what an online client sees). The resume replay in the
  constructor does not notify.
- `RemoteGame`: on `update`, notify with `msg.events` when non-empty (empty = resync).

A callback rather than a reactive `$state` "last events" field: effects coalesce, so two steps arriving in one tick
would lose the first batch. Alternative considered: diffing views in the table (new discard in a pond → click) —
rejected, it is brittle for calls/kan/dora and the events already say exactly what happened.

### Mapping: `cues.ts` (pure)

`cuesFor(events, view, prev)` → `{ id: SoundId; delay?: number }[]` plus updated mapper state; a pure function so
it is unit-testable without audio (vitest, no DOM). Rules:

- `discard` → `tilePlace`; `riichi: true` adds `callRiichi`. `riichiAccepted` → `riichiStick`.
- `call` → by meld type `chii`/`pon`/`daiminkan` → `callChii`/`callPon`/`callKan`, plus `meldPlace`.
- `kanAttempt` → `callKan` and remember the seat; a later `kan` of that seat skips `callKan` (plays `meldPlace`).
  Otherwise `kan` → `callKan` + `meldPlace`.
- `dora` → `doraFlip` (not for the first indicator, which comes with `handStart`).
- `handStart` → `handStart`. `draw` of the own seat → `tileDraw`; other seats' draws → nothing.
- `handEnd`: win → `callTsumo` if any win has `from === null`, else `callRon` (once for a double ron); then after
  ~700 ms the grade of the highest `value.limit` (`yakuman` → `winYakuman`, `none` → `winHand`, else `winLimit`).
  Exhaustive → `drawExhaustive`, abortive → `drawAbortive`.
- `gameEnd` → `gameEndFirst` if `final[0].seat === view.seat`, else `gameEnd` (after the hand-end cue, delayed).
- Own prompts: `yourTurn` on a non-rinshan `draw` event of the own seat (a call leads to a discard without a
  draw, and a kan's replacement draw is rinshan, so neither prompts). `callAvailable` from the view after the batch:
  `view.claimable` is set, `view.actions` contains a non-pass action, and it did not already play for this `seq`.

Why the prompts also run on the view: whether *you* can call is own-view information; the events deliberately do
not say it.

### Playback: `player.ts`

- One lazily created `AudioContext`; created and `resume()`d inside the first `pointerdown`/`keydown` listener on
  `window` (autoplay policy; iOS needs the resume inside the gesture). Before that, `play()` is a no-op.
- Files are fetched + `decodeAudioData`'d on first use of a cue (and all non-null cues are prefetched once audio is
  unlocked and sound is on), cached as `AudioBuffer`s. A failed fetch/decode caches "silent" for that cue.
- `play(id, delay?)`: `BufferSource → GainNode(entry volume × user volume) → destination`. Same-id repeats within
  40 ms are dropped. Everything is wrapped in try/catch.
- Web Audio instead of `<audio>` elements: much lower latency, overlapping playback of the same sound (fast
  discards), and it works in non-secure contexts (LAN HTTP). A module-level singleton, since there is one table.

### Timer warning

`TimerBar` already knows `deadlineAt`. The table runs a 250 ms interval while `deadlineAt` is set and plays
`timeWarning` when the whole-seconds-remaining value drops to 5..1 (once per value). Deadlines only exist online,
for the deciding seat, so offline games never tick.

### Settings

`riichi:sound` (`'1'`/`'0'`, default on) and `riichi:volume` (0..100, default 70) in `localStorage`, read with the
existing `readFlag` pattern in `Table.svelte`, passed to `SettingsSheet` as a checkbox + range input. The player
module holds the current values (setter functions), so the lobby (`matchFound`) respects them too.

## Risks / Trade-offs

- [Autoplay: the very first cues (e.g. `handStart` of a resumed game, `matchFound` when the queue was joined by a
  click) may be skipped] → joining the queue and starting a game both involve a click, which unlocks audio; nothing
  else to do.
- [Mobile Safari suspends the context when the page is backgrounded] → call `resume()` again on the next gesture and
  on `visibilitychange` to visible.
- [Sound spam in fast bot games / fast-forward] → 40 ms same-cue throttle; offline debug autoplay can additionally
  skip cues when the step delay is 0.
- [Sound files and licences] → only CC0 / self-made files; note the source per file in
  `static/audio/README.md` (like the FluffyStuff tiles).
- [A cue for `kanAttempt` makes an existing tell audible] → no new information: the event is already public and
  shown; the sound only mirrors it.

## Open Questions

- Should `tileDraw` play for the own draw at all (Tenhou: no)? Kept in the list, `null` for now.
- Tsumogiri vs hand discard as distinct sounds (some clients do)? Not in the list; easy to add as `tileTsumogiri`.
- Default volume and whether sound should default to off on desktop (open office) — on by default for now.
