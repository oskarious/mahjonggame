## 1. Hover state

- [ ] 1.1 Add `hovered: { tile, x } | null` state in `PlayerArea.svelte`; clear it in the `view.seq` effect
- [ ] 1.2 On mouse `pointermove` with no buttons pressed, set `hovered` from `tileAt`; add `onpointerleave` to clear it
- [ ] 1.3 Feed `hovered` into `magnified` (`press ?? hovered ?? selected`), `focus`, and `preview` (`hovered ?? selected`)

## 2. One-click discard

- [ ] 2.1 In `pointerDown`, for mouse (button 0) record the pressed tile without flick tracking; ignore other buttons
- [ ] 2.2 In `pointerMove`, skip flick/lock logic for mouse presses
- [ ] 2.3 In `pointerUp`, for mouse: discard via `discard()` only if the release tile equals the pressed tile and
      `canDiscard` is true; never set `selected`
- [ ] 2.4 Keep touch/pen paths (`tap(tile, flick)`, one-tap setting) unchanged

## 3. Verify

- [ ] 3.1 `npm run typecheck` passes
- [ ] 3.2 In the browser on localhost: hover shows magnifier, blue board highlight and hint preview; leaving the hand
      clears them
- [ ] 3.3 Left click discards on turn; riichi mode click declares riichi; dimmed tile / off-turn / right click do nothing;
      press-drag-to-other-tile cancels
- [ ] 3.4 Mobile viewport (touch emulation): tap-select, tap-again, flick and one-tap setting behave as before

## 4. Docs

- [ ] 4.1 Update the "Hand input" bullet in `AGENTS.md` UI conventions with the mouse rule (hover = inspect, click =
      discard)
