A link card: a tappable panel that leads somewhere — a trainer, the daily set, the next lesson.

Source: `apps/web/src/routes/+page.svelte` and `routes/train/+page.svelte` (link cards), `lib/home/ContinueLearning.svelte` (progress card).

- **Always a link or a button.** A panel that does nothing is not a card; read-only numbers are Stats.
- `panel` ground, `radius`, padding 14px; brightens 10% on hover (pointer devices only), no ledge.
- **Name** bold 1.1rem in `ink`; one line of **summary** below in 0.9rem `ink-dim`.
- **Facts** (optional) on the right, 0.8rem tabular `ink-dim` with the number bold in `ink`: "**2**/5", "**12** days". Stacked when there are two.
- `surface-me` ground marks today's or yours (the daily set). At most two cards side by side (`space-8` apart); otherwise one per row.
- **Progress variant:** a `label` line on top with the count at its right end on the same line; name and summary span the full width; a 3px bar closes the card, `panel-2` track with an `accent` fill (gold: your progress).
