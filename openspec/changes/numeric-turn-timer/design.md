## Context

`TimerBar.svelte` renders a 3 px track above the own panel (`Table` renders it only when `timed`). The fill drains
over the base time, then over the bank in gold; bank seconds already appear as a small absolutely positioned number
above the right end of the bar. The track is always rendered and hidden with `visibility: hidden` so it never shifts
the layout (`stable-timer-bar-layout`, not yet archived). A 100 ms interval drives `now`; a separate effect plays the
`timeWarning` tick for each of the last 5 s. Props: `deadlineAt` (absolute, Date.now based) and `bank` (ms left
when the deadline was set).

## Goals / Non-Goals

**Goals:**
- Readable seconds at a glance: base seconds, bank reserve, and which one is running.
- Keep the zero-layout-shift guarantee on online tables; offline unchanged.

**Non-Goals:**
- Timers for other seats (we never show them; their deadlines are not sent).
- Any server, protocol or timing change; the pre-deal `Countdown` overlay.
- Urgency colours (red) — gold already means "bank", and the ticks cover the last 5 s.

## Decisions

- **Keep the component and its props, swap the rendering.** `TimerBar` keeps `deadlineAt`/`bank`, the interval, the
  `start`/`base`/`inBank` derivations and the tick effect. The fill is replaced by a number line. Renaming the file
  (e.g. `TurnTimer`) was considered; skip it to keep the diff small (the doc comment says what it is).
- **What the numbers are.** Base mode: main = `ceil((remaining − bank) / 1000)` in `--ink`, secondary = `ceil(bank /
  1000)` small in `--accent`, shown as `0` when the bank is empty (so "no bank left" is visible). Bank mode: main = `ceil(remaining / 1000)` in `--accent`, no
  secondary. Alternative *one combined number (base + bank)* hides the switch into the bank, which is exactly what
  the player needs to notice. Alternative *always show both counting* is two moving numbers; the bank is static
  during base time anyway.
- **Placement: just below the own panel's middle slot** (the tile to act on, where the eye already
  is), taking no layout space at all. `PlayerArea` gets an optional `timer` snippet rendered inside `.middle`
  (`position: relative`); `TimerBar` is absolutely positioned bare numbers centred just below the slot
  (`top: 100%`), in the 6 px gap + the hand strip's empty top padding (a badge on the slot's top edge was tried
  first). Not rendered at all while idle. `tabular-nums` so digits don't jitter. The `timed` flag stays (only online tables mount it) but
  no longer reserves space. Rejected: *a reserved number row above the panel* (first implementation) — ~18 px of
  board height lost for the whole game; *the panel's sides* — covered by call/riichi buttons exactly when the timer
  runs; *beside the tile inside the slot* — widens the slot, and after pon/chii the slot is empty while the timer
  runs.
- **Update cadence.** Keep the 100 ms interval (the displayed second must flip close to the real boundary); Svelte
  only touches the DOM when the derived text changes. No per-second animation, to keep it calm.
- The element stays `aria-hidden` like the bar (the ticks are the audible cue); revisit if we add screen reader
  support to the table.

## Risks / Trade-offs

- [Little room between slot and hand tiles (~3 px spare at 375 px width)] → The hand strip's top padding scales
  with its tile size; check narrow widths if the font size grows.
- [Base seconds read `5` for the first ~1 s even with latency eating part of it] → Same as today's bar; the
  deadline is the server's, we only round up.
