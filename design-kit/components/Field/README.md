The `.field` class: an uppercase label stacked over a 48px input, plus `.form-error` / `.form-ok` lines.

Source: `apps/web/src/app.css`; used on login and account pages.

- Label in `label` style (`ink-dim`, uppercase, 0.06em); input `panel-2`, 1px white-15% border, `radius-input`, 48px tall inside a field (40px elsewhere).
- Errors in `danger`, confirmations in `ok`, `small` size. Both fall short of 4.5:1 on `bg` (1.7:1, 2.9:1) — keep them short and next to the field.
- Selects share the input styling.
