# background-appearance Specification

## Purpose
TBD - created by archiving change background-patterns. Update Purpose after archive.
## Requirements
### Requirement: Configured background colour and pattern
The background colour and the background pattern SHALL each be defined by a single theme token in `app.css`
(`--bg` for the colour, `--bg-pattern` for the pattern image or `none`). Changing a token SHALL be the only edit
needed to change the look site-wide. The pattern SHALL be one of the tiles in `static/patterns/`.

#### Scenario: Change the pattern
- **WHEN** a developer sets `--bg-pattern` to `url('/patterns/pattern_042.svg')`
- **THEN** every page shows that pattern in the background, with no other code change

#### Scenario: No pattern
- **WHEN** `--bg-pattern` is `none`
- **THEN** the background is the plain `--bg` colour and no pattern file is requested

### Requirement: Pattern tiles seamlessly over every page
The pattern SHALL repeat over the entire viewport behind all content on every route (home, login, account, lobby,
play, admin), with no visible seams between tiles, and SHALL stay fixed to the viewport (not scroll with content).
It SHALL NOT receive pointer events or be exposed to assistive technology.

#### Scenario: Full coverage
- **WHEN** any page is shown at any viewport size, including phone portrait with the browser toolbar collapsing
- **THEN** the pattern covers the whole background with no gaps or edges

#### Scenario: Not interactive
- **WHEN** the player taps or clicks on an area where only the background is visible
- **THEN** the event reaches the page as if no pattern layer existed

### Requirement: Pattern stays subdued
The pattern SHALL only darken the background colour where its motif is (by a configured strength) and leave it
unchanged elsewhere, never showing as raw black and white. Which of the tile's two colours is the motif SHALL be
configurable (`--bg-pattern-invert`), since it varies per tile. Seat
rows SHALL be translucent tints of the background so the pattern shows through them less than in the open
background. Tiles, text and buttons SHALL keep the same contrast as without a pattern.

#### Scenario: Pattern behind the board
- **WHEN** a pattern is configured and the play screen is shown
- **THEN** the pattern is visible faintly through the seat rows and more clearly in the gaps between them, and tiles
  and pond contents are drawn opaquely on top

### Requirement: Surfaces derive from the background colour
Seat rows, the own panel, buttons and sheets SHALL derive their colours from `--bg`, so a different background
colour tints the whole UI. With `--bg: #0e0f12` and no pattern, the UI SHALL look as it did before this change.

#### Scenario: Colour carries through
- **WHEN** `--bg` is set to a dark blue
- **THEN** seat rows, the own panel, buttons and the settings sheet are blue-tinted rather than neutral grey

#### Scenario: Default look unchanged
- **WHEN** `--bg` is `#0e0f12` and `--bg-pattern` is `none`
- **THEN** the play screen, home page and sheets are visually indistinguishable from before the change

### Requirement: Diagonal drift animation
The pattern SHALL move continuously at 45°, from the top-right corner of the screen towards the bottom-left, at a
slow constant speed, looping without any visible jump. It SHALL NOT move when the OS reports
`prefers-reduced-motion: reduce`. The motion SHALL be smooth in all major browsers (Chrome, Firefox, Safari): no
visible whole-pixel steps. Per frame it SHALL redraw only the pattern layer (never page content), at no more than
30 fps, and SHALL stop while the page is hidden.

#### Scenario: Direction
- **WHEN** a pattern is shown
- **THEN** every point of the pattern moves left and down by equal amounts over time

#### Scenario: Seamless loop
- **WHEN** the animation completes one cycle
- **THEN** the pattern is in a position indistinguishable from the start, so no jump is visible

#### Scenario: Reduced motion
- **WHEN** the OS setting for reduced motion is on
- **THEN** the pattern is shown but does not move

