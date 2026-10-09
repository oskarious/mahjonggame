## 1. Timer bar slot

- [x] 1.1 In `TimerBar.svelte`, always render the `.timer` track; add a hidden state (`visibility: hidden`, fill at 0, no seconds) when `deadlineAt === null`, keeping the interval and warning-tick effects gated on a pending deadline
- [x] 1.2 In `Table.svelte`, add a `timed` prop (default `false`) and render `TimerBar` only when `timed`
- [x] 1.3 In `routes/online/+page.svelte`, pass `timed` to `Table`

## 2. Docs

- [x] 2.1 Note in `docs/agents/ui.md` that the online table reserves a fixed timer slot so the timer never shifts the layout

## 3. Verification

- [x] 3.1 `npm run typecheck` and `npm test` pass
- [x] 3.2 Browser check (launch configs web-5175 + game): in an online game, measure the board's bounding rect before, during and after an own-turn deadline and while in the bank — identical; offline table has no timer slot; stop the dev servers afterwards
