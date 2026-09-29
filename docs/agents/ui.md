# UI conventions (apps/web play screen and visuals)

Read when changing anything the player sees or touches: the table, hand input, tiles, tilesets, hints display,
sounds, theme. Structure of the web app: [web.md](web.md).

## Layout of the play screen

- **Portrait, one hand.** No square table: **4 seat rows in turn order: right, across, left, you** (left = the only
  chii source, directly above you), then the own panel, then the hand. Rows fill the height; pond tile size is
  computed to fit 18 discards per row and only shrinks if a pond grows past that.
- **Own panel** (PlayerArea, a 3-column grid, exactly as tall as the tile slot, ~73 px): left = round +
  honba/riichi sticks over the hints; middle = the tile to act on (drawn tile, or the claimable tile in a call
  window) in a `--panel-2` slot; right = dora as `indicator → dora` over the wall count (tile outline + number) and
  the settings cog. **Buttons overlay the sides** instead of taking a row: when there is something to decide, the
  left info hides and the choices (Tsumo/Riichi/Kan, Ron/Pon/Chii/Kan, kan/chii options) show two per row; the right
  info hides and Pass (or Back) fills that side. Overlays anchor to the bottom and grow upward over the board if they
  need more room. The play screen has no header and no round bar: leaving the game is a button in the settings sheet.

## Hand

- **Hand input:** the whole hand strip is one touch target (nearest tile wins). Press shows a magnifier (and the
  discard preview at hint level "full"). **Touch: flick up is the only way to discard**; a tap neither selects nor
  discards (no double tap). Once the finger rises past 12 px the tile is locked (sideways drift can't switch tiles);
  36 px arms the discard (magnifier turns gold). **Mouse: hover inspects** (magnifier, blue glow, discard preview) and
  **one left click discards** (press and release on the same tile; never selects). Decided per pointer event, so
  touchscreen laptops get both. Off-turn presses/clicks only inspect.
- **Hand sizing:** the strip splits the column width by the number of concealed tiles (`--n`), so open hands get
  bigger tiles; the size never changes between on- and off-turn. The **drawn tile is not in the strip**: it sits big
  (44 px) in the panel's middle slot with the same gestures and magnifier, but no sideways slide. The magnifier is
  anchored at section level so it floats above the strip or the slot, whichever was pressed.
- **Hand tile index:** own-hand tiles (`Tile compact` prop) keep the artwork but get a larger corner index: 40 % of
  the tile width, 48 % below 32 px (board tiles use 34 %). A centred "index as the face" variant was tried and
  rejected. Inside `Tile`, `--w` may hold `cqw` units, so rules inside `.face` (itself a size container) must use
  `cqw` directly, not `var(--w)`.

## Visuals

- **Visual language (one meaning per cue):** gold glow = dora (incl. red fives); blue glow = matches the tile you are
  holding/selecting (only then — never automatic); raised tile = last discard (`view.lastDiscard`: until the
  next discard or a claim, callable or not) / winning tile; green dot = suggested discard (hint level "full" only); dimmed = not usable for the current decision (illegal discards on turn / in
  riichi mode; in a call window every hand tile no offered pon/chii/kan would use — Ron uses none). Dimmed tiles stay
  inspectable.
- **Minimal text.** Prefer visual cues over explanatory copy; no helper sentences, position labels, "x seen", etc.
  Keep only information-bearing text (yaku, scores, hint values the player opted into, button labels).
- **Tilesets:** Classic (3:4) or Slim (~1:2), a per-device setting (default Slim). **Never hard-code 4/3**: tile height is
  `--w × --tile-ratio` (set by `Tile`, and on `<body>` by `Table` for other CSS; JS reads `tileset().ratio`). Hand,
  ponds and melds keep their width rules (taller tiles with Slim; hand capped at the largest Classic tile's height);
  tiles in the own panel and the magnifier keep their Classic *height*, so the panel never changes size. Slim
  glyphs are SVG text in the device's fonts ('Malgun Gothic', else sans-serif), never a shipped font.
- Tiles show a Latin corner index (1-9 in suit colour, E/S/W/N, Wh/G/R); hidden on tiles < 16 px; toggle in settings
  (the toggle only affects corner labels, never the compact face).
- Dark neutral theme (tokens in `src/app.css`); no green felt.

## Hints

**Hint levels are server-decided** (`viewFor(..., { hints: 'off' | 'distance' | 'waits' | 'full' })`, default off),
intended to depend on Elo; anything above the level is never sent. **Tenpai waits are never gated:** `view.tenpai`
(every level) holds, on the own turn, the waits (and furiten) after each discard that leaves the hand tenpai, and
between turns the current waits; the magnifier shows them under the inspected tile (on turn only for tiles that
can be discarded now, so riichi mode shows riichi discards only). The hint levels add the passive panel display.
The magnifier is `width: max-content` and clamped by its measured width, so wide wait rows stay on screen.

## Sounds

Every cue is listed in `lib/audio/sounds.ts`; `null` = no file yet, silent (no request, no error). Add a sound by
dropping the file into `static/audio` and naming it there. Call stingers come in pairs: `call*` when the own seat
calls, `call*Other` when an opponent does (the caller's seat is public, so this leaks nothing). Cues come only from the step events redacted for the own
seat plus the own view (`GameSource.listen`, via `cuesFor`), never from hidden state; replays and resyncs emit
nothing. Generic stingers, no voice lines or music. On/off + volume in settings (`riichi:sound`, `riichi:volume`);
audio starts on the first user gesture.
