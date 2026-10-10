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
- **Lint and format:** ESLint (flat config in `packages/eslint-config`, re-exported by the root `eslint.config.js`)
  and Prettier (`.prettierrc.json`). Claude Code runs both on every file it edits (`.claude/hooks/format.mjs`, a
  PostToolUse hook in `.claude/settings.json`); other agents run `npm run format` and `npm run lint` after changes.
  Disable a rule inline only with a `-- reason`.
- **typescript-eslint needs TypeScript 6:** it uses the TS JS API, which TypeScript 7 (our compiler) no longer ships.
  So `packages/eslint-config` depends on `typescript@~6.0`, and npm nests typescript-eslint and `ts-api-utils` there.
  `ts-api-utils`'s peer range has no upper bound, so npm may hoist it to the root, where it loads TS 7 and ESLint
  crashes with "Cannot read properties of undefined (reading 'Intrinsic')": move its lockfile entry back to
  `packages/eslint-config/node_modules/ts-api-utils` and reinstall.
