## Context

- Hints are server-decided (`viewFor(..., { hints })`); anything above the level is never sent. Level "waits"
  sends `waits` + `furiten` between turns only; on the own turn `waits` is `[]` on purpose ("would reveal which
  discard keeps tenpai"). Level "full" adds `discards: DiscardOption[]` (waits, furiten, ukeire per discard kind).
- The riichi-legal discards are already in `view.actions` (`{ type: 'discard', riichi: true }`, computed in
  `legalActions` with `waits(rest).length > 0`). So at every level the client already knows *which* tiles keep
  tenpai once riichi is legal; only the *waits* are withheld.
- In `PlayerArea.svelte` the per-discard preview (`preview`) renders in the left info panel, which is covered by the
  button overlay whenever Riichi/Tsumo/Kan is available. So even at "full" the riichi-choice preview is invisible.
- The magnifier floats above the looked-at tile for touch presses, mouse hover and mouse selection, and already
  knows `canDiscard` (it dims as `blocked`).

## Goals / Non-Goals

**Goals:**
- At "waits" and "full", show the waits of each candidate riichi discard while in riichi mode, where the eye is.
- Keep the engine the single source of truth for waits, furiten and riichi legality.
- No leak above the hint level.

**Non-Goals:**
- Per-discard waits outside riichi mode at "waits" (still "full"-only advice, shown in the existing preview line).
- Value previews (yaku, han, ippatsu odds), wait-quality ratings.
- Changing the left panel / overlay layout.

## Decisions

1. **New field `HandHints.riichi?: RiichiOption[]`, not reusing `discards`.**
   `RiichiOption = { kind: Kind; waits: TileCount[]; furiten: boolean }`, built in `handHints` from
   `analyzeSeat(...).discards`, filtered to kinds that have a legal `riichi: true` discard in `legalActions(g, seat)`,
   in the same order (best first). Sent at "waits" and "full"; absent at "distance". Alternative: send
   `discards` filtered to riichi kinds at "waits" — rejected because `DiscardOption` carries ukeire/shanten ("full"
   advice) and would blur what each level contains; a small dedicated type keeps the level contract readable.
   Deriving the kinds from `legalActions` (rather than `tenpai` of the option) keeps it identical to what the Riichi
   button allows (closed hand, wall tiles, points rule, kuikae).
   `handHints` is only called from `viewFor`, which already computes `legalActions`; pass the actions in to avoid
   computing them twice.

2. **Show the waits in the magnifier, not the left panel.** In riichi mode the magnifier gets a second row under the
   tile: the wait tiles (plain, small) with `×remaining`, plus a `furiten` chip. Reasons: the left panel is covered by
   the buttons exactly in this situation; the magnifier appears for every way of "looking at" a tile (touch press,
   mouse hover, mouse press); and the thumb doesn't cover it. Alternative: hide the overlay in riichi mode and use the
   existing preview line — rejected: the Riichi toggle must stay reachable, and on touch the preview line is
   far from the finger. The magnifier's width grows with the waits (at most ~7 kinds for 9-sided waits; they wrap to
   a second line past ~5); its `left` clamp must use the real width so it stays on screen.

3. **Lookup by kind.** `riichiPreview = riichiMode ? hints?.riichi?.find(o => o.kind === kindOf(magnified.tile)) : null`.
   Non-riichi-legal tiles have no entry, so they show nothing (the magnifier is already `blocked`). Waits with 0
   remaining are shown dimmed (still a wait, but dead); same styling as elsewhere if it exists.

4. **Minimal text.** No labels like "waits:"; tiles + counts only, and the existing furiten chip style.

## Risks / Trade-offs

- [Level "waits" gains some on-turn information] → Limited to riichi-legal discards, whose tenpai-ness is already
  public to the player via legal actions; the waits are what that level shows one step later. Covered by a test that
  "distance" never gets it and that "waits" still gets no `discards`/`ukeire`.
- [Extra analysis cost per view] → None new: `analyzeSeat` already runs for "waits"; filtering is O(kinds).
- [Wide magnifier at the screen edge] → Clamp by measured width, or wrap waits to rows of 5.
- [Online clients on an older build] → The field is optional and additive; older clients ignore it. No protocol
  version bump.

## Open Questions

- Should the waits row also show at "full" outside riichi mode (a general "what does this discard wait on" preview in
  the magnifier)? Proposed: not now; revisit after this lands.
