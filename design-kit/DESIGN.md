---
version: alpha
name: Riichi Arena
description: A lightweight, rated riichi mahjong site (chess.com for mahjong), played in portrait with one hand on a green table. Dark only; the tiles are the decoration.
colors:
  primary: "#48754d"
  secondary: "#f2c14e"
  tertiary: "#fbfaf4"
  neutral: "#4d7a55"
  surface: "#4d7a55"
  on-surface: "#ecebe6"
  error: "#e76f51"
  bg: "#48754d"
  tint: "#c4ddff"
  surface-row: "rgba(79, 123, 88, 0.82)"
  surface-me: "rgba(86, 129, 97, 0.82)"
  panel: "#4d7a55"
  panel-2: "#588364"
  line: "rgba(255, 255, 255, 0.08)"
  ink: "#ecebe6"
  ink-dim: "rgba(236, 235, 230, 0.6)"
  accent: "#f2c14e"
  accent-ink: "#2b2104"
  brand-gold-on-light: "#b07d0e"
  danger: "#e76f51"
  danger-ink: "#1f0c05"
  ok: "#7bd389"
  ok-ink: "#0d2a14"
  backdrop: "rgba(0, 0, 0, 0.45)"
  tile-face: "#fbfaf4"
  tile-edge: "#d8d0b8"
  tile-back: "#2c6e8f"
  tile-back-light: "#3a86ab"
  suit-man: "#b3261e"
  suit-pin: "#1f4fa3"
  suit-sou: "#1d7a3a"
  suit-honor: "#1b1b1b"
  red-five: "#d0342c"
  haku-frame: "#3d6fb3"
  glow-gold: "rgba(242, 183, 5, 0.95)"
  glow-gold-edge: "#e0c46a"
  glow-blue: "rgba(76, 195, 255, 0.95)"
  glow-blue-edge: "#8fcde8"
  hint-dot: "#3aa85a"
typography:
  wordmark:
    fontFamily: Bricolage Grotesque
    fontSize: 64px
    fontWeight: 800
    lineHeight: 1
    letterSpacing: -0.03em
  page-title:
    fontFamily: Bricolage Grotesque
    fontSize: 25.6px
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: Bricolage Grotesque
    fontSize: 22.4px
    fontWeight: 700
    lineHeight: 1.2
  sheet-title:
    fontFamily: Bricolage Grotesque
    fontSize: 19.2px
    fontWeight: 700
    lineHeight: 1.2
  button-big:
    fontFamily: Bricolage Grotesque
    fontSize: 18.4px
    fontWeight: 600
    lineHeight: 1.2
  button:
    fontFamily: Bricolage Grotesque
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: Bricolage Grotesque
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.4
  small:
    fontFamily: Bricolage Grotesque
    fontSize: 14.4px
    fontWeight: 400
    lineHeight: 1.4
  meta:
    fontFamily: Bricolage Grotesque
    fontSize: 13.6px
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: Bricolage Grotesque
    fontSize: 12.8px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.06em
  chip:
    fontFamily: Bricolage Grotesque
    fontSize: 12.8px
    fontWeight: 600
    lineHeight: 1.2
  micro:
    fontFamily: Bricolage Grotesque
    fontSize: 11.2px
    fontWeight: 400
    lineHeight: 1
    fontFeature: '"tnum"'
  tile-index:
    fontFamily: system-ui
    fontSize: 9.5px
    fontWeight: 800
    lineHeight: 1
    letterSpacing: -0.04em
rounded:
  xs: 2px
  sm: 3px
  input: 8px
  md: 12px
  sheet: 18px
  full: 999px
spacing:
  space-2: 2px
  space-4: 4px
  space-6: 6px
  space-8: 8px
  space-10: 10px
  space-12: 12px
  space-14: 14px
  space-16: 16px
  space-18: 18px
  space-24: 24px
  control-big: 56px
  control: 48px
  control-seg: 44px
  control-sm: 40px
  page-max: 440px
  sheet-max: 520px
  band-max: 560px
components:
  button:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 18px
    height: 48px
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 18px
    height: 48px
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 18px
    height: 48px
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.danger-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 18px
    height: 48px
  button-big:
    typography: "{typography.button-big}"
    height: 56px
  chip:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.ink}"
    typography: "{typography.chip}"
    rounded: "{rounded.full}"
    padding: 3px 9px
  chip-good:
    backgroundColor: "{colors.ok}"
    textColor: "{colors.ok-ink}"
  chip-bad:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.danger-ink}"
  chip-gold:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
  input:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.input}"
    padding: 8px 10px
    height: 48px
  segmented-option:
    backgroundColor: "{colors.panel-2}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: 44px
  segmented-option-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.panel}"
  sheet:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: 16px 14px 14px
    width: 520px
  band:
    backgroundColor: "{colors.surface-me}"
    rounded: "{rounded.md}"
    padding: 12px 4px
    width: 560px
  card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: 14px
  card-today:
    backgroundColor: "{colors.surface-me}"
  stat-tile:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.md}"
    padding: 10px
  tile:
    backgroundColor: "{colors.tile-face}"
    rounded: 14%
  tile-back:
    backgroundColor: "{colors.tile-back}"
  timer-bar:
    backgroundColor: "{colors.line}"
    rounded: "{rounded.xs}"
    height: 3px
---

# Riichi Arena

Files next to this one: `logos/` (the brand marks as SVG, `og.png`, and the mark as PNG app icons: `icon-48.png`,
`icon-512.png`, `apple-touch-icon.png` with square corners for iOS), `tiles/` (Slim and Classic tile artwork),
`patterns/pattern_044.svg` (the table pattern), `fonts/` (Bricolage Grotesque, OFL), `tokens.json` (every token with
its usage), `tokens.css` and `components/` (a README and an HTML preview per component; open the previews in a browser).

## Overview

Riichi Arena is a lightweight, rated riichi mahjong site: chess.com for mahjong. It is played on a phone in
**portrait, with one hand**, on a green felt-like table under a quiet, slowly drifting pattern. No gacha, no anime
characters, no mascots, no fluff: **the tiles are the decoration.** The mood is a calm club table: game-literate,
terse, competitive but friendly. Density is low; every element carries information.

- **One hand, portrait first.** Everything a thumb needs sits in the bottom half. Touch targets are at least 48px
  tall (segmented options 44px).
- **Minimal text.** Prefer a visual cue to a sentence. Keep only information-bearing text: yaku, scores, button
  labels. No helper copy.
- **One meaning per cue.** Each glow, lift, dot and dim means exactly one thing (see Tiles). Never reuse a cue as
  decoration.
- **Nothing that comes and goes may resize the board.**
- **Cheat-proof by design.** Nothing on screen may hint at hidden information.

**Voice.** Written *Riichi Arena* in prose, page titles, link previews and structured data; only the wordmark is
lowercase (`riichi arena`, a visual treatment). Sentence case
for buttons and headings ("Play online", "Next hand"). Mahjong terms in romaji, capitalised as actions: Ron, Tsumo,
Riichi, Pon, Chii, Kan, Furiten, Tenpai. Tile names in English (East, Green, 5 circles). No emoji.

## Colors

One theme only: **dark**, on the table green. There is no light UI; the `*-on-light` logo files exist for press,
print and social use.

- **Table green (`bg` #48754d)** — the page and the brand colour, also the app icon's rounded square. The pattern
  (`patterns/pattern_044.svg`, inverted, 128px) is multiplied over it at 5% opacity and drifts top-right to
  bottom-left over 85 seconds.
- **Surfaces** are the green lightened toward a cool white (`tint` #c4ddff): board rows `surface-row`
  (translucent), the player's own row `surface-me`, sheets `panel`, controls `panel-2`. Never paint `tint` itself.
- **Ink (#ecebe6)** — all text and icons; `ink-dim` (60%) for uppercase labels and secondary text. `line` for hairlines.
- **Gold (`accent` #f2c14e)** — the single call to action per decision (Play online, Ron, Tsumo) and "you" (your
  seat in the logo, your bank time). Text on gold is `accent-ink`. In print on light grounds the gold is
  `brand-gold-on-light` #b07d0e.
- **Gold bars mean your progress or your time** (the course progress bar, the Rush clock, bank time); any other bar
  is neutral.
- **Status as fills, never text colour alone:** `ok` with `ok-ink` (Tenpai), `danger` with `danger-ink` (Furiten,
  Leave game). Every status also carries a word.
- **Tile colours:** ivory face `tile-face` #fbfaf4 over a `tile-edge` #d8d0b8 ledge; backs a 160° gradient from
  `tile-back-light` to `tile-back` (blue). Corner indices in the suit colours: `suit-man` red, `suit-pin` blue,
  `suit-sou` green, `suit-honor` near-black; red fives white on `red-five`.
- **Glows:** gold `glow-gold` means dora and nothing else; blue `glow-blue` means "same kind as the tile you are
  holding". `hint-dot` green marks a suggested discard.

Measured contrast: `ink` on `bg` 4.5:1, on `panel-2` 3.6:1; `accent-ink` on `accent` 9.5:1. Keep body text on `bg`
or `panel`; `danger` and `ok` are too weak as text on green, so use them as fills.

## Typography

Everything is set in **Bricolage Grotesque** (variable, weights 200–800, with optical size), the same face as the
wordmark; the file is in `fonts/`. Weight carries the hierarchy: text 400, labels and buttons 500–600, numbers and
emphasis 700. **Weight 800 belongs to the wordmark and the seat winds only.**

Scale (16px root): page title 25.6, title 22.4, sheet title 19.2 (bold); big button 18.4 and button 16 (semibold);
body 16; small 14.4; meta 13.6; label and chip 12.8; micro 11.2. Labels are UPPERCASE with 0.06em tracking in
`ink-dim` ("LENGTH", "RULES", "OPPONENTS"). Numbers that update or line up (ratings, scores, timers) use tabular
figures. Tile corner indices use the system face at 800; the Slim tile glyphs are SVG text in the device's fonts.

## Layout & Spacing

Phone portrait first. Narrow pages are one column, max 440px (`page-max`), with an 18px side gutter and 24px top
and bottom (plus the safe-area inset). Steps: 2, 4, 6, 8, 10, 12, 14, 16, 18, 24px; the default gap is 8px, controls
in a group 6px.

Content that needs the width (a hand of tiles) goes in a **band**: a full-bleed strip on `surface-me` that breaks out
of the column, edge to edge on phones and 560px centred on wider screens, with a small uppercase label heading.
Bands keep 18px above and below (collapsing with the neighbours' margins). Counts sit top right, on the line of the
label they belong to (a band's countdown, a progress card's `2/26`), never in a column of their own.
Sheets rise from the bottom, max 520px wide, over a 45% black scrim. On the play screen the player's own panel sits
at the bottom; buttons overlay its sides two per row rather than adding a row, and room for timers is reserved so
the board never jumps.

## Elevation & Depth

Depth is a **hard ledge, not a blur.** Buttons carry a 2px solid shadow (`0 2px 0 rgba(0,0,0,.35)`) and drop it when
pressed (moving 1px down). Tiles have the same idea: a solid `tile-edge` ledge under the face (8% of the tile width)
plus a soft small shadow, like a real tile's thickness. Ghost buttons are outlined (1.5px inset, white 25%). Only
floating overlays (the hand magnifier) get a soft shadow (`0 8px 24px rgba(0,0,0,.5)`). A raised tile (last
discard, winning tile) lifts by 18% of its width with a drop shadow.

## Shapes

Friendly but firm: 12px radius for buttons, panels and segmented options; 8px for inputs; 18px top corners on bottom
sheets (bottom corners square); full pills for chips; 2–3px for small marks (timer bar, riichi stick). **Tiles round
their corners at 14% of their width** and keep their aspect ratio per tileset — Slim 60:119 (the default, about 1:2)
or Classic 3:4. Never assume one fixed ratio.

The brand mark is four tiles in a pinwheel — the table seen from above — on a green rounded square; the bottom tile,
you, is gold, the other three ivory.

## Components

Each has a README and an HTML preview in `components/`.

- **Button** — 48px tall, 12px radius, hard ledge. Default `panel-2` (Pon, Chii, Kan); **primary** gold, at most one
  per decision (Ron, Tsumo, Play online); **ghost** outlined for declining (Pass, Back); **danger** for destructive
  (Leave game); **big** 56px for start buttons, optionally with a tabular value on the right (a rating).
- **Chip** — small pill stating a fact: neutral, good (green), bad (red), gold (Riichi, Mangan). Always a word.
- **Field** — uppercase label over a 48px `panel-2` input with a faint white border, 8px radius.
- **Segmented control** — a grid of 44px options; the chosen one inverts to an ink fill with green text.
- **Sheet** — bottom sheet on `panel` for hand results, final standings and settings; one primary button to move on.
- **Band** — full-bleed strip for a hand of tiles on a narrow page.
- **Header** — sticky bar on every page but the game: wordmark, sections (current in ink), the compact CTA (Play / Sign
  up) and the account icon. Fits 360px on one line.
- **Card** — a tappable `panel` that leads somewhere: bold name, dimmed summary, facts on the right; `surface-me` for
  today's. Progress variant: label line with the count on its right, a 3px gold bar. Never static.
- **Stats** — four read-only tiles, two by two: label over a bold tabular number with a dimmed unit.
- **Tile** — ivory face, edge ledge, artwork, corner index on a light plate; states: gold glow (dora), blue glow
  (matching), raised (last/winning), green dot (hint), dimmed (not usable now), sideways (called / riichi), back.
- **Timer bar** — 3px bar above the own panel; dim while in the turn allowance, gold with seconds when bank time runs.

Motion is short and functional: tile lift 90ms ease-out, timer 100ms linear, countdown pop 250ms; honour reduced
motion.

## Do's and Don'ts

- Do keep the table green as the ground and let ivory tiles and gold carry the eye.
- Do use gold for exactly one action per screen, or for "you".
- Do use the logo files as they are; don't redraw, recolour or re-letter the marks. Use the `*-on-light` versions on
  light grounds.
- Do give every cue one meaning: gold glow is only dora, blue glow only "same kind as held".
- Don't add characters, mascots, anime art, gacha-style sparkle, gradients-for-show or emoji.
- Don't use soft blurred drop shadows for buttons or cards; depth is a hard ledge.
- Don't use weight 800 outside the wordmark and seat winds.
- Don't stretch or squash tile artwork or hard-code a 3:4 tile.
- Don't put explanatory copy where a visual cue would do.
- Don't rely on colour alone for status; pair it with a word.
