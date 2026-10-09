## 1. Numeric timer

- [x] 1.1 In `TimerBar.svelte`, derive `mainSecs` (base mode: `ceil((remaining − bank) / 1000)`; bank mode: `ceil(remaining / 1000)`) and `bankSecs` (`ceil(bank / 1000)`, shown in base mode, `0` when the bank is empty); keep the interval, `start`/`base`/`inBank` and the warning-tick effect unchanged
- [x] 1.2 Replace the track/fill markup with a number line: main number (ink; gold in bank mode) plus the small gold bank number; `tabular-nums`, fixed min-widths so digit changes don't move anything; remove the `fraction`/fill code and CSS
- [x] 1.3 Fixed slot height (one line of the main number, `line-height: 1`), centred over the own panel's middle slot; `visibility: hidden` and no numbers when `deadlineAt === null`; keep `aria-hidden`
- [x] 1.4 Update the component's header comment

## 2. Docs

- [x] 2.1 `docs/agents/ui.md`: describe the own timer as seconds counting down (ink base + small gold bank, gold in bank mode) in its reserved slot

## 3. Verification

- [x] 3.1 `npm run typecheck` and `npm test` pass
- [x] 3.2 Browser check (launch configs web-5175 + game, localhost): in an online game see `5` + small `20` on the own turn, the `10` dealer opening, the switch to gold bank seconds after the base runs out; measure the board's bounding rect idle / base / bank / at `20` → `9` — identical; offline table has no slot; check 375×667 ponds still fit; stop the dev servers afterwards

## 4. Timer below the tile slot (no own row)

- [x] 4.1 `PlayerArea.svelte`: optional `timer?: Snippet` prop rendered inside `.middle`; `.middle` gets `position: relative`
- [x] 4.2 `Table.svelte`: stop rendering `TimerBar` as its own row; pass it as PlayerArea's `timer` snippet when `timed`
- [x] 4.3 `TimerBar.svelte`: absolutely positioned bare numbers centred just below the slot (`top: 100%`), in the space above the hand strip (moved there from the slot's top edge on request), nothing rendered while idle; header comment updated
- [x] 4.4 `docs/agents/ui.md`: timer sits below the tile slot, no reserved row
- [x] 4.5 typecheck + tests; browser check at 375×667: board rect identical idle / base / bank, and the board is taller than with the row; timer does not cover hand tiles; stop the dev servers
