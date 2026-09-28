## Context

`Tile.svelte` draws every tile: a `.face` box (`--tile-face` colour, edge and shadow, rounded corners) with the
FluffyStuff SVG inset 7 % / 8 % inside it, plus overlays (corner index, tint, glow, dim, hint dot, haku frame).
Its height is hard-coded as `--h: calc(var(--w) * 4 / 3)`, and the 4/3 is repeated in layout code:

- `Board.svelte` `fit()` (`byHeight … / (4 / 3)`), `meldUnits()` (a sideways tile = 1/3 extra width) and the meld
  line height (`--meld-tw * 4 / 3`);
- `PlayerArea.svelte` `.middle` min-height (`44px * 4 / 3 + 14px`, which sets the ~73 px own panel).

The slim set (`D:\jobb\mahjong\packages\client\src\lib\assets\tiles\default`, untracked there; drawn by the project author, free to use here) is
37 SVGs: `man|pin|sou/{1..9,5r}.svg` and `hon/{e,s,w,n,wh,g,r}.svg`, viewBox `0 0 60 119`. Findings:

- The tile body is a rounded rectangle with `fill:none` and the art clipped to it: the art is **edge to edge**,
  with no inner margin. `hon/wh.svg` is the exception: a body filled `white`, and nothing else.
- Man and honor glyphs are **`<text>` in 'Malgun Gothic' Bold** (萬, 一…九, 東南西北, 發, 中). Phones don't have that
  font, and the stack has no generic fallback; phones have CJK sans-serif system fonts, which the fix uses.
- Pin tiles are 19–156 KB each (every circle is a separate detailed path, ~940 KB for the set); sou 3–8 KB,
  man / honors ~2 KB.

## Goals / Non-Goals

**Goals:**
- Try the slim set on real phones against Classic, switching live, with no other difference between the two.
- Remove the hard-coded 4/3 so any future tileset only needs a ratio and an image mapping.
- Assets that look the same on every device and aren't much heavier than today's.

**Non-Goals:**
- Redrawing or restyling the slim art (colours, glyphs), or a slim tile back (backs stay the CSS gradient).
- Per-account (server-side) settings; a tileset picker with previews; more than two tilesets.
- The decorative Chun on the home page (stays Classic).

## Decisions

### 1. A tileset is data: `{ id, ratio, image(kind, red), inset }`
`lib/tiles.ts` gets a `TILESETS` record (`classic`, `slim`); `kindImage` / `tileImage` take the tileset. `inset`
is the art's position in the face (Classic `7% 8%`, Slim `0`). *Alternative:* a CSS-only switch with background
images per class — rejected, the layout JS (`fit`) needs the ratio anyway and one place should own it.

### 2. The active tileset is a small global rune store, mirrored into a CSS variable
`lib/tileset.svelte.ts`: `$state` with the id, read from `riichi:tileset` (try/catch, unknown → slim, the default), a setter
that writes it. A root effect (in `Table`, like `no-tile-labels`) sets `--tile-ratio` on `<body>`. `Tile` uses
`--h: calc(var(--w) * var(--tile-ratio, 4 / 3))` and reads the image mapping from the store; `Board.fit()` and
`meldUnits()` read the ratio from the store so they re-run when it changes. *Alternative:* Svelte context from
`Table` — rejected: tiles also appear in sheets and the magnifier; a module store keeps it one line everywhere
and the setting is per device anyway.

### 3. Own panel keeps its height; the slot tile is as tall as before
`.middle` keeps `min-height: calc(44px * 4 / 3 + 14px)` (a fixed panel height, now written as a constant), and the
drawn / claimable tile gets `--tw: calc(44px * 4 / 3 / var(--tile-ratio))`: 44 px wide for Classic, ~30 px for
Slim, the same height. Switching then never moves the board. *Alternative:* keep 44 px width → an 87 px tall Slim
tile and a taller panel; rejected as it steals board height for a single tile. The same rule applies to every tile
in the panel and the magnifier (dora, indicator, waits, call choices): found in testing, the dora pair alone made
the panel 3 px taller with Slim.

### 4. Hand strip: same width rule, taller tiles, Classic height cap
The strip keeps `--tw = width / n`; with Slim the tiles are ~1.5× taller. That is the experiment: bigger art for
the same width, at the cost of ~18 px of board height on a phone with 13 tiles (measured at 390 × 844: hand strip
53 → 71 px, each seat row 170 → 165 px). The old 52 px width cap becomes a height cap (the largest Classic hand
tile, ~69 px): without it an open hand of 8 tiles grew to 42 × 83 px in testing.

### 5. Convert the art once, commit the result
A one-off Node script (`apps/web/scripts/slim-tiles.mjs`, run by hand, not part of the build) reads the source
folder and writes `apps/web/static/tiles/slim/…`:
- keeps the `<text>` glyphs but gives them a fallback: `font-family: 'Malgun Gothic', sans-serif; font-weight: 700`
  (today it is `'MalgunGothicBold', 'Malgun Gothic'` with no generic fallback), and sets `xml:lang="ja"` on the root
  so the fallback picks Japanese glyph forms (Hiragino / Noto Sans CJK JP on phones);
- drops the white body of `hon/wh.svg` (the client's haku frame is drawn by `Tile`, as for Classic; check it
  suits the slim proportions);
- runs svgo (precision 2, merge paths) to shrink the pins; target < 250 KB for the whole set.
*Alternative:* outline the glyphs as paths (identical everywhere) — rejected: it means baking a proprietary font's
outlines into shipped art; referring to a font by name ships nothing, and the system sans-serif looks good.
The script is dev-only (`npx`), nothing new in `dependencies`. The output keeps the source
file names (`man/5r.svg`, `hon/wh.svg`), mapped in `TILESETS.slim.image`.

### 6. Setting UI
A two-option segmented control "Tiles: Classic | Slim" in `SettingsSheet`, next to the tile labels toggle, for
offline and online. No preview text (minimal text rule).

## Risks / Trade-offs

- [Glyphs differ per device] Fallback fonts have other widths and heights than Malgun Gothic, so a glyph can sit a
  little off-centre, or be clipped by the tile's clip path → check the fallback in the browser by forcing it (a
  copy with `font-family: sans-serif` only) and on a real Android phone and iPhone; if a glyph is clipped, shrink
  it a little or centre it with `text-anchor="middle"` / `dominant-baseline="central"`.
- [System fonts inside `<img>`] Tiles are loaded as `<img>`, which may use installed fonts but not web fonts —
  enough here, since only system fonts are used; confirmed in 1.2.
- [Board height] Taller hand tiles shrink the ponds → compare screenshots at 390 × 844 and 360 × 740; if needed, cap
  the strip tile height (e.g. at the Classic height + 25 %).
- [Corner index on narrow tiles] The index is sized from the width; on ~28 px slim tiles it covers more of the
  (big) glyph → check both label settings; if it hurts, a per-tileset index scale.
- [Missed 4/3] A hard-coded ratio left somewhere clips or overlaps tiles → grep for `4 / 3` / `4/3`; the spec
  scenarios (18-discard pond, melds with sideways tiles) are the checklist.

## Migration Plan

Pure client change; no data. Rollback = remove the setting (stored values then fall back to Classic).

## Open Questions

- Is the Classic height cap on hand tiles right for Slim, or should Slim hands be shorter (more board)?
- Keep Classic long term, or drop it once Slim has been played with on phones?
