## 1. Engine: riichi options in the view

- [x] 1.1 Add `RiichiOption { kind, waits: TileCount[], furiten }` and `HandHints.riichi?: RiichiOption[]` in
      `packages/engine/src/view.ts` (doc comment: "waits" and up, own turn only, riichi-legal kinds); export the type
- [x] 1.2 In `handHints`, take the seat's legal actions (passed from `viewFor`), collect kinds with a
      `discard` + `riichi: true` action, and map the matching `analyzeSeat().discards` entries to `RiichiOption`s
      (best first); set at "waits" and keep at "full"; empty between turns / when riichi is not legal
- [x] 1.3 Tests in `packages/engine/test/analysis.test.ts`: "waits" on turn lists exactly the riichi kinds with their
      waits and counts, still no `discards`/`ukeire`; "distance"/"off" get none; furiten option flagged; open hand or
      too few wall tiles or too few points → empty; kuikae/`legalActions` agreement on random hands
- [x] 1.4 Mutation-check the new tests (e.g. send riichi at "distance", drop the furiten flag) and confirm they fail

## 2. Play screen: waits in the magnifier

- [x] 2.1 In `PlayerArea.svelte`, derive `riichiPreview` from `riichiMode`, `magnified` and `hints.riichi` (by kind)
- [x] 2.2 Render a waits row under the magnified tile: plain wait tiles with `×remaining` (0 dimmed) and a `furiten`
      chip; nothing when there is no entry; keep the tile-only magnifier outside riichi mode
- [x] 2.3 Keep the magnifier on screen when it is wider (clamp using its measured width or wrap waits to rows of 5);
      check a 9-sided wait on a 360 px wide viewport
- [x] 2.4 Verify in the browser (offline play, hint level "waits" and "full"): touch press, mouse hover, mouse press
      on riichi-legal and non-legal tiles; the flick/discard behaviour and the gold armed state are unchanged

## 3. Checks and docs

- [x] 3.1 `npm test` and `npm run typecheck` pass
- [x] 3.2 Update `AGENTS.md` (hint levels / UI conventions): riichi options at "waits", waits shown in the magnifier
      in riichi mode
