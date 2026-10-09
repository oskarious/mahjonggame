## 1. Engine

- [x] 1.1 Add `lastDiscard: { seat: Seat; tile: Tile } | null` to `HandState` (game.ts); initialise to null in hand setup
- [x] 1.2 Set it in `discard()`; clear it in `applyCall()` (pon / chii / daiminkan)
- [x] 1.3 Default `lastDiscard` to null in `test/helpers.ts` `rig()` (and any other hand-built states)
- [x] 1.4 Add `PlayerView.lastDiscard` in view.ts, filled from `g.hand.lastDiscard`
- [x] 1.5 Tests: stays set through the next draw and through a closed kan; moves on the next discard; null after a pon/chii; null at hand start; covered by the fairness suite (identical on the `scrambleHidden` state)

## 2. Web

- [x] 2.1 `Pond.svelte`: rename the `claimable` prop to `last` and mark `d.tile === last`
- [x] 2.2 `Board.svelte`: pass `view.lastDiscard`'s tile for its seat instead of `view.claimable`
- [x] 2.3 Update the AGENTS.md "Visual language" line: raised tile = last discard (until the next discard or a claim) / winning tile

## 3. Verify

- [x] 3.1 `npm test` and `npm run typecheck` pass
- [x] 3.2 Offline game in the browser (web-5175): an uncallable discard stays raised while the next seat thinks; a pon clears it; a reload/resume keeps it; stop the dev server afterwards
