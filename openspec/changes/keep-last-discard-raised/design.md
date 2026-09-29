## Context

`Pond.svelte` raises a discard with `mark='last'` when `d.tile === claimable`, and `Board.svelte` passes
`view.claimable` for that seat. `claimable` is only set while the step is `calls` / `chankan`, so the raise vanishes as
soon as the call window closes, and never appears for discards nobody can call (no window opens; the next draw
happens at once). `PlayerView` has no notion of "last discard", and `Discard` entries carry no global order, so the
client can't reliably work it out from the ponds (calls and kans break "previous seat in turn order").

## Goals / Non-Goals

**Goals:**
- One raised pond tile = the current last discard, from discard until the next discard or a claim.
- Works identically offline (LocalGame) and online (RemoteGame), including after reload, resume and resync.

**Non-Goals:**
- Changing the look of the raise, or the `win` mark on the winning tile.
- Raising the claimed tile inside the caller's meld.
- Changing the call-window tell itself (the window still stays open until callers answer; see Fair play).

## Decisions

- **Engine state, not client memory.** Add `lastDiscard: { seat: Seat; tile: Tile } | null` to `HandState`; set it in
  `discard()`, clear it in `applyCall()`, null in the hand setup. Alternative: track it in the client from `discard`
  step events — rejected: lost on reload/resync and on offline resume, and each GameSource would need its own logic.
- **Expose via `viewFor` as `PlayerView.lastDiscard`.** Public information (every discard and its order is visible to
  the table), so it's safe for every seat and hint level; `scrambleHidden` leaves it untouched and the fairness tests
  cover it automatically. Alternative: derive it in `viewFor` from `step` — impossible once the window has closed.
- **Chankan untouched.** During chankan `claimable` is the added-kan tile, which isn't in any pond; the pond now uses
  only `lastDiscard`, so the previous discard simply stays raised ("until the next discard").
- **Pond compares by tile id** (ids are unique), so `Board` passes the tile when `view.lastDiscard?.seat === seat`;
  `Pond`'s prop is renamed from `claimable` to `last`. `claimable` stays in the view for the panel slot, sounds and
  call buttons.
- **Hand end:** `lastDiscard` is left as is (a ron tile stays raised under the result; the next hand resets it).

## Risks / Trade-offs

- [Hand-built states in tests (`rig()`, fixtures) lack the field] → default it to null in `rig()`; TypeScript flags
  the rest.
- [Running games on deploy] → recovery replays action logs through `applyAction`, so rebuilt states have the field; no
  state snapshots are stored. Offline saves are action logs too — no `SAVE_VERSION` bump.
- [Protocol shape change] → additive field; web and game server deploy together.
