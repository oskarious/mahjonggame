# Local development and browser checks

Read when running dev servers, doing browser checks, or when the dev setup misbehaves.

- Setup: copy `apps/web/.env.example` → `apps/web/.env` and `apps/game-server/.env.example` → `apps/game-server/.env`;
  an optional root `.env` overrides the local Postgres credentials (see `.env.example`). `npm run dev` starts both
  servers via `scripts/dev.mjs`; `npm run dev:web` / `npm run dev:game` start one. Vite proxies `/ws` to
  `GAME_SERVER_URL`.
- **Dev ports:** something else on this machine may already listen on 3001/5173. Override with `PORT` in
  `apps/game-server/.env`, `GAME_SERVER_URL` in `apps/web/.env` (used by the Vite /ws proxy and the home page
  health check) and `WEB_INTERNAL_URL` in the game server's env; `.claude/launch.json` has spare configs.
- The game server's `WEB_INTERNAL_URL` must point at the web server that set the cookie (dev: the Vite port the
  browser uses); in dev Better Auth derives its base URL from the forwarded request's Host.
- **Stop the dev servers you started as soon as your browser check is done** (`preview_stop`), so the next agent
  finds the port free. Don't add new launch configs to dodge a busy port; reuse the existing ones.
- Do browser checks on `http://localhost:5173` (the LAN URL triggers permission prompts); prevent LAN-only breakage
  in code (see web.md → gotchas).
- **Vite dev server can serve stale/half-written modules on Windows** after rapid successive edits (symptoms: old UI,
  "does not provide an export named …", 500 Internal Error). `touch` the files or restart the dev server.
- Screenshots in the browser pane can render as 2× crops; use a `scale` < 1 or measure via JS.
