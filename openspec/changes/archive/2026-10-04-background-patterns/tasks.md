## 1. Surfaces derive from the background colour

- [x] 1.1 Screenshot the play screen (offline game), home page and settings sheet at the current look as a baseline
- [x] 1.2 In `app.css`, redefine `--surface` / `--surface-me` as translucent and `--panel` / `--panel-2` as opaque
      `color-mix` tints of `--bg`; add the `@supports not` fallback with the old fixed greys
- [x] 1.3 Make `html` paint `var(--bg)` and `body` transparent; find and remove any opaque full-screen backgrounds on
      routes/components that would hide a background layer
- [x] 1.4 Compare against the baseline with the default `--bg` and no pattern; tune percentages until
      indistinguishable

## 2. Pattern layer and drift

- [x] 2.1 Add the tokens `--bg-pattern` (initially `none`), `--bg-pattern-size`, `--bg-pattern-strength`,
      `--bg-drift-period` to `:root` in `app.css`
- [x] 2.2 Add `BgPattern.svelte` (fixed viewport canvas, `aria-hidden`, `pointer-events: none`) to
      `routes/+layout.svelte`, styled in `app.css` (strength as opacity, `mix-blend-mode: multiply`)
- [x] 2.3 Draw the tile as a repeating canvas pattern moving one tile left + one tile down per period (≤ 30 fps,
      rAF), inverted once if `--bg-pattern-invert` is 1; drawn still under `prefers-reduced-motion: reduce`
- [x] 2.4 With a test pattern set, check every route (home, login, account, online lobby/table, play, admin) at phone
      and desktop sizes: full coverage, no seams, no jump at the loop point, taps pass through, layer not hidden
- [x] 2.5 Check in Firefox and Chrome that the drift is smooth (no whole-pixel steps) and costs little CPU

## 3. Pick the shipped look

- [x] 3.1 Try a few candidate tiles and colours on a phone (LAN) with the play screen in a real game; choose one tile
      and colour together with the user
- [x] 3.2 Set `--bg` and `--bg-pattern` to the choice, update `theme-color` in `app.html` to match, tune
      `--bg-pattern-size`, `--bg-pattern-strength` and `--bg-drift-period`
- [ ] 3.3 Verify ponds, hand tiles, buttons and sheet text are as readable as before; check reduced motion stops the
      drift

## 4. Wrap up

- [ ] 4.1 `npm run typecheck` and `npm run build --workspace @mahjong/web` pass
- [ ] 4.2 Update AGENTS.md (UI conventions: background tokens, derived surfaces, pattern layer; the "Dark neutral
      theme" line) and note the pattern tiles' source/licence if known
