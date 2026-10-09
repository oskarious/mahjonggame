## Context

- The theme is a set of CSS tokens on `:root` in `apps/web/src/app.css`. `--bg` (`#0e0f12`) is painted on `:root` and
  `body`; seat rows (`--surface`, `--surface-me`), the own panel slots and buttons (`--panel-2`) and sheets
  (`--panel`) are **opaque** greys slightly lighter than `--bg`. So today a background image would only be visible
  in the thin gaps between seat rows, and a different `--bg` would clash with the fixed greys.
- The 84 SVGs in `static/patterns/` are 256×256 tiles made only of `#000000` and `#FFFFFF` fills (≈0.4–9 KB each).
  Which colour is the "motif" varies per tile. They appear to tile seamlessly (paths touch the 0/256 edges).
- Target is mid-range phones in portrait; the play screen already does a lot of layout work, so the background must
  cost nothing per frame beyond compositing.
- Scope for now: we pick colour and pattern in code. A player-facing picker comes later.

## Goals / Non-Goals

**Goals:**
- Colour and pattern set by two tokens; one-line changes.
- A pattern that is clearly there but never competes with tiles or text; the colour tints the whole UI.
- A seamless 45° drift (top-right → bottom-left) that runs on the compositor only.
- `--bg: #0e0f12` + no pattern reproduces today's look exactly.
- Keep the mechanism ready for a later player setting (it will only need to set the same tokens on `<html>`).

**Non-Goals:**
- Any player UI, persistence, or per-user choice (later change: picker in the settings sheet, `localStorage` or
  account, pre-paint apply).
- Light themes; changing ink, accent or tile colours.
- Speed / scale / strength controls (fixed constants).

## Decisions

### 1. Tokens in `app.css`
```css
:root {
  --bg: #0e0f12;
  --bg-pattern: url('/patterns/pattern_NNN.svg');  /* or none */
  --bg-pattern-size: 128px;       /* 256 px tiles drawn at half size read better on a phone */
  --bg-pattern-strength: 0.06;
  --bg-drift-period: 24s;
}
```
All background behaviour is plain CSS keyed off these. A later player setting sets the same properties inline on
`document.documentElement`; nothing else changes. Which tile and colour ship first is picked together while
implementing (task 3), by looking at candidates on a phone.

*Alternative considered:* a TS constants module + inline styles from the layout. More moving parts for the same
result, and it wouldn't be SSR-painted without extra work. CSS tokens are server-rendered and already how the theme
works.

### 2. The pattern layer: one fixed canvas, redrawn with a moving offset
`BgPattern.svelte` (in `+layout.svelte`, before the page) is a fixed, viewport-sized `<canvas class="bg-pattern">`
(`z-index: -1`, `pointer-events: none`, `aria-hidden`). On mount it reads the tokens from `:root`, loads the SVG,
draws one tile at `--bg-pattern-size` into an offscreen canvas (inverting it there once if `--bg-pattern-invert` is
1), makes a repeating `CanvasPattern` and fills the canvas with it at offset `(-o, +o)`, where
`o = (t mod period) / period × size`.

- **Direction and seamlessness:** the offset grows from 0 to one tile left and one tile down per period — the 45°
  diagonal from top-right to bottom-left — and a one-tile shift of a repeating pattern is identical to the start, so
  the loop has no jump.
- **Why a canvas, not a CSS transform animation (history):** the first version animated `transform` on an oversized
  fixed div with a CSS background (compositor-only, no repaints). In Firefox it moved in visible one-pixel steps a few
  times a second: at ~5 px/s the renderer snaps the slowly moving layer to whole pixels. Neither a `rotate(0.01deg)`
  anti-snap transform nor plain-px keyframes (instead of `var()`) helped. Canvas pattern fills at fractional offsets
  are resampled with smoothing in every browser, so sub-pixel motion is smooth by construction.
- **Cost:** one `fillRect` of the viewport per frame, capped at 30 fps (plenty at ~5 px/s), canvas at CSS-pixel
  resolution (softer on high-DPR phones; invisible at 12 % strength), `requestAnimationFrame` so hidden tabs stop.
  Page content is never repainted by it. Reduced motion: drawn once at offset 0, redrawn on resize and when the
  preference changes.
- **No pattern:** with `--bg-pattern: none` the component returns before loading anything; the canvas stays empty.
- **No JS yet:** until hydration the canvas is empty, so the pattern appears a moment after the colour. Acceptable.
- **Stacking:** `html` paints `var(--bg)`; `body` becomes transparent so the fixed layer at `z-index: -1` in the root
  stacking context is visible between them. Verify no route wraps content in an opaque full-screen element; the play
  screen's own background, if any, must become transparent. Fallback if a stacking context gets in the way:
  `z-index: 0` layer and `position: relative; z-index: 1` (or `isolation: isolate`) on the app root.

### 3. Tinting: the motif darkens (multiply), invert picks the motif
The layer uses `mix-blend-mode: multiply` at `--bg-pattern-strength` (0.12): white parts of the tile leave `--bg`
unchanged, black parts darken it by the strength. `filter: invert(var(--bg-pattern-invert))` swaps the two colours
for tiles whose motif is white (e.g. 002). The layer only blends with the root background (it sits below all content),
and filter + blend are applied to the layer once, not per frame.

*History:* first built as plain opacity (black darkens, white lightens: two tones around `--bg`). Changed on request so
the pattern only darkens where it appears and the surrounding colour stays exactly `--bg`.

*Alternatives considered:* rewriting the SVG fills to computed colours (exact tones, but fetch + string rewrite +
object URL, and not SSR-paintable); `mask-image` with the black path stripped from each SVG (needed later for a
separate pattern colour).

### 4. Surfaces derive from `--bg`
```css
--tint: #c4ddff;   /* surfaces lighten --bg towards this cool white */
--surface:    color-mix(in srgb, color-mix(in srgb, var(--bg), var(--tint) 6%) 82%, transparent);
--surface-me: color-mix(in srgb, color-mix(in srgb, var(--bg), var(--tint) 11.4%) 82%, transparent);
--panel:      color-mix(in srgb, var(--bg), var(--tint) 4.4%);
--panel-2:    color-mix(in srgb, var(--bg), var(--tint) 13.2%);
```
The old greys are not `--bg` mixed with pure white; they lean slightly cool (+9/+10/+12 over `--bg` for R/G/B), and a
white mix lost up to 4 units of blue. So the mix partner is `--tint`, the cool white that direction points to: with
the default `--bg` the four tokens render the old `#17191e` / `#1f2228` / `#16181d` / `#262a31` to within one unit
(rows measured composited over the plain background). Seat rows let ~18 % of the pattern
through; sheets, buttons and panel slots stay opaque (text-heavy). `color-mix` is in all current browsers (Safari
16.2+, Chrome 111+, Firefox 113+); an `@supports not (color: color-mix(...))` block keeps the old fixed greys.
`--line`, ink, accent and tile tokens are unchanged. `theme-color` in `app.html` is kept equal to `--bg` by hand.

## Risks / Trade-offs

- [Some tiles are not seamless or too busy at 6 %] → only the chosen tile matters now; check it at the real size on a
  phone. Reviewing all 84 happens with the player picker later.
- [Pattern hurts pond readability] → rows are 82 % opaque and the strength is low; if busy, raise row opacity or lower
  the strength token.
- [Animation costs battery on low-end phones] → one viewport fill at ≤ 30 fps, stops in hidden tabs and under
  reduced motion; lower `FRAME_MS` further or drop the drift if it proves a problem.
- [Derived surface tokens shift the default look slightly] → pixel-compare play screen, home and sheets before/after
  with the default colour and no pattern.
- [A route's opaque wrapper hides the layer] → check every route in the browser.

## Migration Plan

Purely client-side CSS. Rollback = set `--bg-pattern: none` or revert.

## Open Questions

- Which colour and tile ship first (decided visually during implementation).
- Exact drift period and tile size (tune on a real phone).
- Later: a separate pattern colour (`--bg-pattern-color`). This would need a CSS mask instead of opacity, with the
  black path removed from each SVG so it can serve as the mask. That is easy to script: every tile is exactly one
  black and one white `<path>`, with no transforms or opacity.
