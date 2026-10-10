The `.btn` class: a 48px-tall rounded action with a hard 2px ledge that drops when pressed.

Source: `apps/web/src/app.css` (static rendition; the app is Svelte, so there is no component bundle).

- **Default** (`panel-2`): secondary game actions — Pon, Chii, Kan, Continue.
- **Primary** (`accent` with `accent-ink`): the one action you most likely want — Play online, Ron, Tsumo, Next hand. At most one per decision.
- **Ghost** (transparent, `shadow-ghost` outline): declining — Pass, Back, Abort hand.
- **Danger** (`danger` with `danger-ink`): destructive — Leave game.
- **Big** (`.btn.big`, 56px, `button-big`): the start buttons on the home and online pages; may carry a second, tabular value on the right (rating, round).
- Hover (pointer devices only, `@media (hover: hover)`): filled buttons brighten 10%; ghost gets a faint white fill (6%) and a firmer outline (40%). Never on touch, where a tap would leave it stuck.
- Pressed: the ledge drops (shadow off, 1px down).
- Disabled: `disabled` opacity (0.4), no hover.

The consumer provides the label (one or two words, sentence case) and the handler. In the own panel, buttons sit two per row and overlay the side info instead of adding a row.
