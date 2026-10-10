A full-bleed band: a section of a narrow page that breaks out of the page column, for content that needs the width — a hand of tiles sized from the screen.

Source: `apps/web/src/lib/components/Band.svelte` (used by the home page's daily discard).

- **Width:** `min(100vw, band-max)`, centred on the page column: edge to edge on phones (square corners there), `band-max` (560px) with `radius` corners on wider screens.
- **Ground:** `surface-me`. Padding 14px top, 12px bottom, only 4px at the sides, so tile rows get nearly the whole screen.
- **Heading:** a `label` (uppercase, 0.06em, `ink-dim`, semibold), with an optional aside on the right in the same style and tabular numerals (a countdown, a count). It lines up with the page column: the band's 4px plus `--band-inset` (14px) = the page gutter `space-18`.
- **Text rows inside** (errors, totals) indent by `--band-inset` too; tile rows and tables run the full inner width.
- It is a container (`container-type: inline-size`): tile rows inside measure the band, never the viewport.
- Stack content with `space-10`. One band per decision on a page; it does not replace sheets or the play screen.
