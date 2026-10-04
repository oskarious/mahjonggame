# Deployment

Read when touching Dockerfiles, `compose.production.yml`, env vars, migrations' startup behaviour, or Dokploy.

- Hosted on a VPS with **Dokploy** (builds on push to GitHub `master`) as one **Docker Compose** application:
  compose path `compose.production.yml`, services `web` (root `Dockerfile`, port 3000) and `game-server`
  (`apps/game-server/Dockerfile`, port 3001), both on `dokploy-network`. **Domains tab: the same host twice**:
  path `/` → service `web` port 3000, and path `/ws` → service `game-server` port 3001 (Traefik handles the
  WebSocket upgrade). HTTPS via Dokploy/Traefik. The `ports:` entries in the compose file are for local checks only.
- Switching from the old single Application (Dockerfile) deploy: create the Compose app from the same repo, copy the
  env vars, add the two domain entries, deploy, then remove the old application. Rollback: remove the `/ws` domain
  (or stop `game-server`); the web app keeps working (offline play, accounts).
- **Postgres** runs as a Dokploy database service on the same network (not in the compose file). Env on the compose
  app: `DATABASE_URL` (internal URL of that service), `BETTER_AUTH_SECRET` (≥ 32 random chars),
  `ORIGIN=https://<domain>`, `ADDRESS_HEADER=X-Forwarded-For`, `XFF_DEPTH=1`; the compose file itself sets
  `WEB_INTERNAL_URL=http://web:3000` and `GAME_SERVER_URL=http://game-server:3001`, and passes `INTERNAL_TOKEN`
  (≥ 32 random chars; set it on the compose app) to both services for `/admin`. Migrations run when the web
  container starts (fail → container exits); the game server refuses to start until its `REQUIRED_MIGRATION` is applied.
- **A migration that rewrites ids** (e.g. `0006_uuid_ids` remapped human user ids to UUIDs): back up the database
  first and deploy while no rated human games run. Until it is replaced, the old game server still holds the old
  ids and its writes for human seats fail (bot-only games are unaffected).
- The web image contains `apps/web/build` (engine, protocol, drills bundled) plus production `node_modules`; the game server
  image runs the TS sources directly (game server, engine, protocol, drills) with production deps (ws, kysely, pg,
  node-cron). Both answer `GET /healthz` without the DB.
- Deploys don't lose games: actions are persisted before they are shown, the new game server resumes running games
  from the database and clients reconnect with backoff (check once whether Dokploy recreates only changed services).

## Building the images locally

```bash
docker build -t riichi-web .  # web image; runs `node apps/web/build` on port 3000, GET /healthz
docker build -t riichi-game -f apps/game-server/Dockerfile .   # game server image, port 3001, GET /healthz
DATABASE_URL=... BETTER_AUTH_SECRET=... ORIGIN=http://localhost:8080 docker compose -f compose.production.yml up --build
                             # both production images locally (web :8080, game server :8081); needs `docker network
                             # create dokploy-network` once and host.docker.internal in DATABASE_URL
```
