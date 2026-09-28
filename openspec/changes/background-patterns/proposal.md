## Why

The site has one fixed look: a flat charcoal background (`--bg: #0e0f12`). 84 seamless two-tone pattern tiles
(`apps/web/static/patterns/pattern_000.svg` … `pattern_083.svg`, 256×256, black and white only) have been added to
give it more character, but nothing uses them yet. As a first step we (the developers) choose a background colour and
a pattern for everyone; letting players choose comes later and should build on this without rework.

## What Changes

- **Site-wide background colour and pattern, chosen in code**: two theme tokens in `app.css` (`--bg` and
  `--bg-pattern`) set the colour and which pattern tile repeats over the whole background of every page. Changing
  either is a one-line edit.
- **Subdued tint**: the pattern is drawn faintly as two tones of the background colour, never as raw black and white,
  so it doesn't compete with tiles or text.
- **Drift animation**: the pattern slowly and seamlessly moves at 45°, from the top-right corner towards the
  bottom-left. Off when the OS asks for reduced motion.
- **Surfaces follow the background**: seat rows become translucent tints over the background (the pattern shows
  through them, subdued); panels, buttons and sheets become opaque tints derived from `--bg`, so a different colour
  carries through the whole UI. Tiles and text keep their contrast.
- No player-facing settings, no storage.

## Capabilities

### New Capabilities
- `background-appearance`: the configured background colour and pattern, how the pattern is tiled, tinted and
  animated (direction, seamless loop, reduced motion), and how surfaces derive from the background colour.

### Modified Capabilities
<!-- none: no existing spec in openspec/specs covers the UI appearance -->

## Impact

- `apps/web/src/app.css`: `--bg` / `--bg-pattern` tokens, surface tokens derived from `--bg`, the pattern layer and
  its animation; `body` background handling.
- `apps/web/src/routes/+layout.svelte`: the fixed pattern layer behind all pages.
- `apps/web/src/app.html`: `theme-color` updated if the colour changes.
- `apps/web/static/patterns/`: served as-is; only the chosen tile is fetched.
- No engine, protocol, game-server or database changes.
