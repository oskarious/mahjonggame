# game-asset-warmup Specification

## Purpose
TBD - created by archiving change warm-game-assets. Update Purpose after archive.
## Requirements
### Requirement: Audio unlocks on the first gesture anywhere on the site
The sound player SHALL listen for the unlocking user gesture (pointer, touch or key) from app start on every page,
not only once a game table is shown. The first such gesture SHALL create (or resume) the audio context and start
fetching and decoding every cue that has a file, provided sound is switched on.

#### Scenario: Tap on Quick play unlocks audio for the game
- **WHEN** the player opens the site, taps "Play online" and then "Quick play", and is seated
- **THEN** the first cue of the game (e.g. a discard) plays without any further tap in the game

#### Scenario: Offline game started from the home page
- **WHEN** the player starts a bot game from the home page
- **THEN** sounds play from the first discard on

#### Scenario: Cue files are ready before they are needed
- **WHEN** the audio context has been unlocked and sound is on
- **THEN** every cue file named in the manifest is requested and decoded once, before the game emits it

#### Scenario: Sound switched off
- **WHEN** sound is switched off in settings
- **THEN** no cue file is requested; switching it on later fetches them

#### Scenario: Page loaded straight into a game
- **WHEN** the page is loaded directly into a running game (reload, reconnect) with no gesture yet
- **THEN** cues stay silent without error until the first gesture, then play normally

### Requirement: Tile artwork is warmed before play
The client SHALL preload and decode every image of the active tileset from app start, in idle time so the
current page renders first, and SHALL keep the decoded images referenced for the life of the page. When the tileset
is changed, the new tileset SHALL be warmed the same way. A failing image SHALL NOT raise errors or block anything.

#### Scenario: First sight of a tile kind
- **WHEN** an opponent discards a tile kind not yet shown in this game
- **THEN** its artwork appears in the same frame as the tile, without an empty face

#### Scenario: Warmup happens once per tileset
- **WHEN** warmup is requested again for a tileset already warmed on this page
- **THEN** no further image requests are made

#### Scenario: Tileset switched in settings
- **WHEN** the player switches from Slim to Classic during a game
- **THEN** every Classic image is preloaded and decoded

### Requirement: Tile artwork is cacheable long-term
Tile image URLs SHALL be content-hashed build assets so browsers cache them as immutable; a changed image SHALL get
a new URL. Warmup and normal rendering SHALL use the same URLs.

#### Scenario: Repeat visit
- **WHEN** a returning player opens a game after the site was visited before and the artwork has not changed
- **THEN** tile images are served from the browser cache without network revalidation

#### Scenario: Artwork updated
- **WHEN** a tile SVG changes and the site is redeployed
- **THEN** clients load the new image (its URL differs) instead of a stale cached one

