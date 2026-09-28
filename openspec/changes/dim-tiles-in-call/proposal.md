## Why

In a call window (Pon / Chii / Kan / Ron offered on someone else's discard) the whole hand looks exactly as it does
off-turn, so the player has to work out which tiles the call would use while a 5 s timer runs. On their own turn in
riichi mode we already dim the tiles that can't be riichi-discarded; the call window should use the same cue so the
relevant tiles stand out at a glance.

## What Changes

- While a call window is open for the player, hand tiles that no offered call would use are dimmed (same `dim` look
  as illegal discards on turn / in riichi mode).
- Tiles that some offered call would take out of the hand stay bright: the pon pair(s), every possible chii partner,
  and the three copies for an open kan. The claimable tile in the panel's middle slot is never dimmed.
- A Ron-only window takes no tiles from the hand, so the whole hand dims and only the claimable tile stands out.
- While picking among several chii options, the hand keeps the same dimming (union of all options).
- Tiles stay fully inspectable while dimmed (magnifier, board highlight) — dimming is visual only.
- Off-turn with nothing to decide, and on the player's own turn, behaviour is unchanged.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `hand-display`: adds a requirement for dimming hand tiles during a call window, based on which tiles the offered
  calls would use.

## Impact

- `apps/web/src/lib/components/PlayerArea.svelte`: `tileState()` gains a call-window branch; a derived set of
  "call tiles" built from `view.actions` (pon/chii `tiles`, daiminkan = all hand copies of the claimable kind).
- No engine, protocol or server changes: the offered call actions already reach the client in `view.actions`
  (only for the seat that has them), so nothing new is revealed.
