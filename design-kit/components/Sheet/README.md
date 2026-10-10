A bottom sheet: the hand result, final standings and settings rise from the bottom over a scrim.

Source: `ResultSheet.svelte`, `FinalSheet.svelte`, `SettingsSheet.svelte`.

- `panel` background, `radius-sheet` top corners, max `sheet-max` (520px) wide, at most 92dvh tall and scrolling inside.
- Padding 16px top, 14px sides and bottom plus the safe-area inset; content gap `space-12`; sections separated by a `line` hairline.
- Heading in `sheet-title`; totals bold, right-aligned; one primary button to move on.
- Scrim: `backdrop`.
