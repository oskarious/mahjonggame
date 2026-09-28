## Why

The play screen is portrait and one-handed, and it is almost always short of **width**: 13–14 hand tiles share
the width of a phone, and a pond row wants 6+ tiles side by side. Our FluffyStuff tiles are 3:4, so every tile's height
comes from its width, and the tiles are narrow and short. A slim tileset (60 × 119, about **1:2**) from the older
`mahjong` project is drawn to be read when it is narrow: big glyphs, a clean face. It could give more readable
tiles in the same width, or the same tiles in less width. We don't know which trade-off is better on a real phone,
so we want to **try it side by side** without committing to it.

## What Changes

- Add the slim tileset to `apps/web/static/tiles/` (in its own folder), cleaned up for the web: the text glyphs of
  the character and honor tiles get a fallback font (they are set in *Malgun Gothic*, which phones don't have; they
  fall back to the system's bold sans-serif), the
  white body of the white dragon removed, and the circle tiles optimized (up to 156 KB each today).
- Make the tile **aspect ratio a property of the tileset** instead of the hard-coded `4 / 3` in `Tile`, the pond fit
  in `Board`, the meld row height and width, and the own panel slot. Sideways tiles (calls, riichi) follow the ratio.
- A **Tiles** setting (Classic / Slim) in the settings sheet, stored per device (`riichi:tileset`), for offline and
  online play. It is a display choice only: nothing reaches the server or the engine. **Slim is the default**;
  Classic stays available.
- Everything drawn on top of a tile (corner index, dora / focus tint, glow, dim, hint dot, raised last discard, the
  magnifier) keeps working on either tileset.

## Capabilities

### New Capabilities
- `tilesets`: selectable tile artwork with its own aspect ratio; layout (hand strip, ponds, melds, own panel,
  magnifier) that follows the selected tileset's ratio; the per-device setting.

### Modified Capabilities
(none — no archived specs exist yet in `openspec/specs/`)

## Impact

- `apps/web/src/lib/tiles.ts` (image paths per tileset), `components/Tile.svelte` (ratio, image inset),
  `Board.svelte` (`fit`, meld units / height), `PlayerArea.svelte` (drawn-tile slot, hand strip padding, magnifier),
  `SettingsSheet.svelte` + `Table.svelte` (the setting), result / final sheets that show tiles.
- New static assets (~37 SVGs); a one-off conversion script kept out of the build.
- No engine, protocol or game server changes. Fair play unaffected (pure presentation).
- The slim artwork is the project author's own. Its glyphs are text drawn with the device's own fonts; no font
  file or font outlines are shipped.
