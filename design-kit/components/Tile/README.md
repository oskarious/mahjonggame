One mahjong tile: ivory face, edge ledge, artwork, corner index, and the table's cues.

Source: `apps/web/src/lib/components/Tile.svelte` (static rendition here).

- Size comes from `--tw` (the width). Height is `--tw × --tile-ratio` — Classic 4/3, Slim 119/60. Never hard-code 4/3.
- Artwork: the Tiles asset group (`slim/…` default, `classic/…`); red fives have their own art (`5r`, `-Dora`).
- Corner index: suit colour on a `tile-index-bg` plate; red five white on `red-five`; hidden under 16px; bigger in the own hand (`.compact`).
- States, one meaning each: `.glow-gold` dora · `.glow-blue` same kind as the held tile · `.last`/`.win` raised · `.hint` green dot (suggested discard) · `.dim` not usable now · `.sideways` called tile or riichi discard · back (face-down).
- The consumer provides the tile, the red-five rule and which marks apply; the board decides dora and focus, never the tile itself.
