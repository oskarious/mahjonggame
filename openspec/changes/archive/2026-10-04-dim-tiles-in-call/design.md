## Context

`PlayerArea.svelte` already dims hand tiles via `tileState(t)`: on the player's turn a tile is dimmed when it is not
a legal discard (or, in riichi mode, not a legal riichi discard). In a call window (`inCall` = not on turn, but
`view.actions` is non-empty) nothing is dimmed. The offered calls are in `view.actions` for the deciding seat only:
`pon` and `chii` carry the exact hand `tiles` they would use (one action per distinct red/plain combination),
`daiminkan` carries no tiles, `ron` and `pass` carry none.

## Goals / Non-Goals

**Goals:**
- Dim hand tiles no offered call would use; keep call partners and the claimable tile bright.
- Reuse the existing `dim` prop and look on `Tile` — one cue, one meaning ("not usable for the current decision").

**Non-Goals:**
- Per-option highlighting while choosing a chii (e.g. hovering an option lights just its two tiles). Possible later.
- Dimming for on-turn kan choices (ankan / shouminkan) — the turn's discard dimming stays as is.
- Any engine, protocol or server change.

## Decisions

- **Derive a `callTiles: Set<TileId>` in PlayerArea from `actions`.** Union of `pon.tiles`, `chii.tiles`, and for
  `daiminkan` every tile in `view.hand` whose kind equals `kindOf(view.claimable.tile)`. Working on tile ids (not
  kinds) means that if only the red five, or only the plain five, can be used, exactly those ids stay bright; since the
  engine emits an action per red/plain combination, both show when both are usable.
  - Alternative: compute by kind. Rejected — a hand with three 5p where only two are ever used would look the same
    either way, but tile ids are exact and cost nothing.
- **Extend `tileState`:** `dim = onTurn ? !allowed : inCall ? !callTiles.has(t) : false`. `inCall` already stays
  true while `picking === 'chii'` (the actions don't change until the player acts), so picking needs no extra case.
  The hint `mark` is only given to discardable tiles already, so nothing changes there.
- **Ron undims nothing.** "Bright = what the call takes from your hand" is a single rule; ron takes nothing. With
  Ron-only, the fully dimmed hand plus the bright claim tile says "this tile is the decision".
  - Alternative: ron undims the whole hand. Rejected — with Ron + Pon it would hide the pon partners.
- **Claimable tile:** it is rendered in the middle slot without `dim`, so it stays bright with no change.

## Risks / Trade-offs

- [A dimmed hand could read as "you can't act"] → the action buttons are already overlaid on the panel, and the
  same dim look is familiar from riichi mode.
- [Inspecting dimmed tiles] → dimming is only the `dim` class on `Tile`; press/hover code paths don't consult it
  off-turn, so inspection keeps working. Verify in the browser.
