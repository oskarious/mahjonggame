Stat tiles: four read-only numbers about the player, two by two — rating, games this week, streaks.

Source: `apps/web/src/lib/home/PlayerStats.svelte` (signed-in players on the home page).

- Four `panel` tiles, two by two (four in a row would wrap the numbers on phones), `space-6` apart, padding 10px, `radius`.
- Each tile: a `label` (0.7rem here) over a bold tabular number (1.05rem); its unit follows in 0.75rem `ink-dim` ("1 / 7d", "3 streak").
- Not links: a number that leads somewhere belongs on a Card.
- A change follows its number signed ("+9", "−19"). It is coloured `ok` / `danger` as text, an open deviation from status as fills (the sign carries the meaning too).
