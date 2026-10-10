The `.seg` class: a grid of radio labels for picking one of a few options.

Source: `apps/web/src/app.css`; used on the home page for Length, Rules and Opponents.

- Two columns by default; set `grid-template-columns` for more (the Elo row uses five, tabular numerals).
- Options are `control-seg` (44px) tall, `radius`, `panel-2`; the chosen one inverts to `ink` fill with `panel` text.
- Hover (pointer devices only): unchosen options brighten 10%, like buttons; the chosen one stays as it is.
- The consumer provides a `<label>` per option wrapping a visually hidden `<input type="radio">`, and toggles `.on` on the checked one.
- Put an uppercase `label`-style legend above it.
