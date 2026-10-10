The site header: a sticky bar on every page but the game, with the wordmark, the sections, the way to play and the account.

Source: `apps/web/src/lib/components/ContentShell.svelte` (the home page, Learn and Train).

- **Bar:** sticky at the top; padding 10px, 16px on the left, plus the safe-area inset; `bg` at 92% with a 6px backdrop blur; a `line` hairline below. Items `space-12` apart.
- **Left:** the wordmark (`wordmark.svg`, 20px tall) linking home, then the sections (Learn, Train) in semibold `ink-dim`; the current one is `ink` and carries `aria-current="page"`.
- **Right:** the call to action, a compact primary button (36px): "Play" for signed-in players, "Sign up" for guests. Then the account icon: a 24px outline person in `ink-dim` (`ink` on hover) on a 36px target, linking to the account, or to sign in for guests.
- It fits a 360px screen on one line; add a section only if it still does.
- The play screen has no header: leaving a game is a button in its settings sheet.
