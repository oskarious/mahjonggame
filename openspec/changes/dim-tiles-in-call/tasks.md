## 1. Implementation

- [x] 1.1 In `apps/web/src/lib/components/PlayerArea.svelte`, add a derived `callTiles` set: union of `pon`/`chii`
      action `tiles`, plus every `view.hand` tile of the claimable kind when `daiminkan` is offered
- [x] 1.2 Extend `tileState(t)` so that in a call window (`inCall`) tiles not in `callTiles` are dimmed; on-turn and
      idle behaviour unchanged
- [x] 1.3 Confirm the claimable tile in the middle slot is never dimmed and that press/hover inspection still works on
      dimmed tiles off-turn

## 2. Verification

- [x] 2.1 `npm run typecheck` passes
- [x] 2.2 In offline play on `http://localhost:5173` (or the web-5175 launch config), reach a pon window and check that
      only the pair and the claim tile are bright (screenshot)
- [x] 2.3 Check a chii window with several shapes (all partners bright, picking keeps the dimming), a Ron-only window
      (whole hand dim), and that a normal turn and riichi mode dim as before
      (browser-checked: chii with two shapes, picking, normal turn, idle off-turn. Ron-only, open kan and riichi mode
      were not reached in play; covered by code reading — the on-turn branch is unchanged)
- [x] 2.4 Add a short note to the UI conventions in `AGENTS.md` (visual language: dimmed = not usable for the current
      decision, incl. call windows)
