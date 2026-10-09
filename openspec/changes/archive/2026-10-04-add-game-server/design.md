## Context

- `packages/engine` is pure and deterministic: `createGame(rules, seed)`, `applyAction`, `legalActions`,
  `pendingSeats`, `timeoutAction`, `viewFor(state, seat, { hints })`, `redactEvent`, bots via
  `botAction(g, seat, { skill, random })` and `skillForElo` / `botElo` from a measured calibration table. A game is
  reproducible from `(rules, seed, actions[])`.
- `apps/web` (SvelteKit, adapter-node) runs games in the browser through `LocalGame` (`view` + `act()`), and now has
  accounts: Better Auth on Postgres via Kysely, migrations in `apps/web/migrations` run on server start. The auth module
  depends on SvelteKit (`$app/*`, `$env/*`), so other services cannot import it.
- Production: one VPS, Dokploy building Dockerfiles on push, Traefik in front, Postgres as a Dokploy service on the
  internal network. Single instance of everything.
- Mobile-first: players are often on flaky connections and switch apps, so disconnects are normal, not exceptional.

## Goals / Non-Goals

**Goals:**
- Server-authoritative online games for signed-in players, reusing the existing table UI.
- Quick-play matchmaking with bot fill so a single player always gets a game quickly.
- Elo ratings anchored to the calibrated bots; rating-based hint levels.
- Durable game records that make restarts, deploys and crashes a non-event.
- Same-origin deployment (`/ws`) as a second container in one Dokploy Compose app with the web app; simple local
  development.

**Non-Goals:**
- Private rooms, friends, invites, spectating, chat, emotes.
- Replay/history UI (records are stored; viewing them is a later change), leaderboards, profiles.
- Online play for guests, per-format ratings, provisional-rating UI, seasons, decay.
- Horizontal scaling (multiple game-server instances), cross-region.
- Anti-collusion analysis; beyond server authority and basic rate limits.

## Decisions

### 1. Separate `apps/game-server` service (Node 22 + `ws`)
Long-lived rooms with timers don't fit SvelteKit's request model, and deploying the web app must not interrupt games.
A plain Node process with the `ws` library, one HTTP server that only handles the `/ws` upgrade and `/healthz`.
TypeScript runs directly with Node's type stripping (the engine and protocol are erasable-syntax TS; workspace packages
resolve to their real paths outside `node_modules`, where stripping is allowed), so there is no build step.
- *Alternatives*: WebSockets inside the SvelteKit adapter-node server (deploys kill games, couples scaling);
  Socket.IO/Colyseus (heavier, own protocols; we need little beyond rooms and JSON); bundling with esbuild (possible
  later if startup time or image size matters).

### 2. Authentication: forward the cookie to the web app once per connection
On upgrade the server checks the `Origin` header against `ORIGIN`, then calls
`GET {WEB_INTERNAL_URL}/api/auth/get-session` forwarding the request's `Cookie` header. A valid response gives the
account id and display username; anything else closes the upgrade with 401. No auth config is duplicated and Better
Auth stays the only thing that understands its cookies.
- *Alternatives*: reading the `session` table directly (must re-implement Better Auth's signed-cookie format);
  extracting auth into a shared package (the auth module is SvelteKit-bound today; revisit if a third service needs it);
  one-time tokens minted by the web app (extra round trip and endpoint, no benefit on one domain).

### 3. Shared `packages/protocol`
Typed messages both sides import. JSON over the socket; every message has a `type`. Client → server:
`hello { version }`, `queue.join { format }`, `queue.leave`, `act { gameId, seq, action }`, `ready` (next hand),
`resync`, `hints { level }`, `ping`. Server → client: `welcome { user, rating, activeGame? }`, `queue.status { format,
waitedMs }`, `game.start { gameId, seat, players[] }`, `update { gameId, seq, view, events[], deadline? }`,
`error { code, requestSeq? }`, `takenOver`, `game.end { final, ratingChanges }`, `server.restarting`, `pong`.
Incoming messages are validated by hand-written guards (small, no dependency); oversized (> 16 KB) or malformed messages
close the connection.
- *Alternatives*: zod (fine, but a dependency on both sides for a dozen message shapes); binary encoding (premature).

### 4. Full view per update
Each `update` carries the player's complete `PlayerView` plus that step's redacted events. Views are a few KB, the
client stays trivial (`view` replaces state; events are only for animation), and resync is the same message. Sequence
numbers (`GameState.seq`) order updates; actions carry the `seq` they were based on and are rejected if stale.
- *Alternative*: event-only deltas (smaller, but client-side state reconstruction and more resync edge cases).

### 5. Rooms: one serialized pipeline per game
A `Room` owns the `GameState`, the four seats (`human { userId, conn | null, bank, disconnectedSince }` or
`bot { skill }`), and its timers. All inputs (client actions, timeouts, bot moves, "ready") go through one per-room queue
so they apply strictly in order: validate (seat, legality, seq) → append to the database → `applyAction` →
send each connected human `viewFor` + `redactEvent`s → schedule the next timers/bot moves. Persist-before-send is what
makes crashes safe.
- Bots act after a randomized 400–900 ms delay (natural pace, never instant).
- Between hands (`handOver`) the room waits until every connected human has sent `ready`, or 12 s, then `nextHand`.
- Hint level per seat is computed from the player's rating at game start (Decision 9) and passed to `viewFor`.

### 6. Timers (server-side deadlines)
Defaults (config): base 8 s for an own turn, 5 s for a call response; time bank 15 s, reset at the start of every hand.
The server stores an absolute deadline per pending decision and sends `deadline` (remaining ms) with the update; the
client counts down locally. On expiry the room applies `timeoutAction`. Timers are not persisted; after a restart the
pending decision gets a fresh base time.
- *Alternative*: per-game bank without reset (punishes one slow hand for the rest of an East+South game).

### 7. Disconnects and takeover
Heartbeat: server pings every 20 s; two missed pongs mark the connection dead (mobile networks drop silently).
After a 10 s grace period a disconnected seat is played by a bot at `skillForElo(player rating)`; the human keeps their
seat and resumes on reconnect (the next decision is theirs again). Timeouts keep running during the grace period.
Closing the connection deliberately is the same as a disconnect; there is no "leave game" that frees the seat. A game
with no human connected for 5 minutes is fast-forwarded by bots to the end (records and ratings as normal).

### 8. Matchmaking (in memory)
One queue per format. A 1 s tick sorts waiting players by rating and forms tables greedily: a player's acceptable gap is
`150 + 20 × seconds waited` (capped at 800). Four mutually compatible players start immediately; after the fill delay
(15 s) the oldest waiter's compatible group (1–3 humans) starts with bots at `skillForElo(mean human rating)`. Seats
are shuffled with a server RNG. A player in a queue or game cannot join another (the second connection takes over the
first, per spec). Queue state is lost on restart (clients rejoin automatically).

### 9. Ratings
Table `rating(userId, rating, games)`; new players start at 1000. Update after each finished game, for humans only:
`Δ_i = (K / 3) × Σ_j (S_ij − E_ij)` over the other three seats, `E_ij = 1 / (1 + 10^((R_j − R_i)/400))`, `S = 1 / 0.5 /
0` for above / tie / below on final points, ratings taken at game start. `K = 40` for the first 20 games, then `20`.
Bots use `botElo(skill)` and never change. Stored rounded to integers.

**Anchoring the bots to the human scale:** the calibration table currently pins skill 0.45 to 1500, which would put
every bot far above a new player's 1000. The calibration anchor moves to skill 0.15 = 1000 (a clear beginner), shifting
the whole table by a constant (differences are unchanged, so no re-run is needed; the script's anchor constant changes
for future runs). The offline Elo presets on the home screen follow automatically.

Hint levels in online games: rating < 1100 → `waits`, < 1300 → `distance`, otherwise `off` (config); a client
`hints` message can lower but not raise it.
- *Alternatives*: Glicko-2 (better uncertainty handling, more state and tuning; Elo was the product decision); scoring by
  point differences (noisier in mahjong than placements).

### 10. Data model and migrations (owned by `apps/web`)
New Kysely migrations in `apps/web/migrations` (the single migration runner), types added to its `schema.ts`; the game
server has its own small Kysely table types for the tables it uses and refuses to start until the expected migration
has been applied (it checks `kysely_migration`).
- `rating (userId PK → user.id ON DELETE CASCADE, rating int, games int, updatedAt)`
- `game (id text PK, format text, rules jsonb, seed text, status 'running'|'finished', createdAt, endedAt, final jsonb)`
- `game_seat (gameId → game ON DELETE CASCADE, seat smallint, userId → user.id ON DELETE SET NULL, botSkill real,
  ratingBefore int, ratingAfter int, placement smallint, points int, PK(gameId, seat))`
- `game_action (gameId → game ON DELETE CASCADE, seq int, action jsonb, at timestamptz, PK(gameId, seq))`
One insert per action (awaited before broadcasting). On startup: load `status = 'running'` games, replay `game_action`
in `seq` order through the engine, rebuild rooms with all humans disconnected.
- *Alternatives*: a shared `packages/db` owning schema and migrations (cleaner long-term; more churn right after the
  accounts change — revisit when a third consumer appears); storing the action log as one growing jsonb column
  (rewrites the row on every action).

### 11. Web client
- `$lib/game/remote.svelte.ts`: `RemoteGame` with the same surface the table uses (`view`, `act()`, player names, red
  fives, plus `deadline`, `connection`, `ratings`). Auto-reconnect with backoff; on `welcome` with an active game it
  resumes it.
- The table screen (board, player area, sheets) moves into a component that takes either game source, used by `/play`
  (offline) and `/online` (queue → game). Settings in online games omit debug controls and bot strength.
- Home: a "Play online" button with the player's rating for signed-in users; guests see only offline play.
- Dev: Vite proxies `/ws` to `ws://localhost:3001`, so dev is same-origin like production.

### 12. Shutdown and deploys
Because every action is persisted before it is shown, shutdown needs no draining: on SIGTERM the server stops the
matchmaking tick, sends `server.restarting`, closes sockets and exits. The new instance resumes games from the
database; clients reconnect with backoff.

### 13. Deployment: one Dokploy Compose app, two containers
`compose.production.yml` at the repo root defines two services, each built from its own Dockerfile (context = repo
root):
- `web`: the existing root `Dockerfile`, port 3000.
- `game-server`: `apps/game-server/Dockerfile` — `npm ci --omit=dev --workspace @mahjong/game-server`, copy
  `packages/engine`, `packages/protocol`, `apps/game-server`, run `node apps/game-server/src/main.ts`, port 3001,
  healthcheck on `/healthz`.

Dokploy runs this as a single **Docker Compose** application (deploy on push, one set of env vars and logs). In its
Domains tab the same host maps `/` → `web:3000` and `/ws` → `game-server:3001` (Traefik handles WebSocket upgrades).
Both services join the `dokploy-network` as Dokploy requires for compose domains; the game server reaches the web app
internally at `WEB_INTERNAL_URL=http://web:3000`. Postgres stays the existing Dokploy database service (not in the
compose file). Environment (set once on the compose app, passed per service): web — `DATABASE_URL`,
`BETTER_AUTH_SECRET`, `ORIGIN`, `ADDRESS_HEADER`, `XFF_DEPTH`; game-server — `DATABASE_URL`, `ORIGIN`,
`WEB_INTERNAL_URL`.

Compose recreates only services whose image changed, so a web-only push normally leaves the game server (and live
games) running; when both change, games resume per Decision 12.

Local dev is unchanged in shape: the root `docker-compose.yml` still only provides Postgres, and `npm run dev` starts
web and game server as processes.
- *Alternatives*: two separate Dokploy applications (independent lifecycles and rollbacks we don't need; two things to
  configure and keep in sync); one container/process serving both (simplest, but every web deploy would drop all
  players to reconnect, and a problem in one part takes down the other).

## Risks / Trade-offs

- [Single process holds all live games] A crash interrupts every game briefly → persist-before-send + resume on start;
  the compose restart policy (`unless-stopped`) brings the container back.
- [Compose redeploy behaviour depends on Dokploy] If Dokploy restarts every service on each deploy, live games reconnect
  on every push → acceptable given resume (Decision 12); check once after the first compose deploy.
- [Session check depends on the web app] If the web app is down, nobody can connect → acceptable: the site is down
  anyway; live connections keep working.
- [One DB insert per action] Latency on every move → a few ms on the internal network; batch later if needed.
- [Node type stripping in production] New TS features outside erasable syntax would break at runtime → the existing
  `erasableSyntaxOnly` config catches it at typecheck.
- [Bot anchor is a guess] Mapping skill 0.15 to 1000 is arbitrary until humans play → ratings are relative; re-anchor
  once human data exists (a constant shift for everyone keeps comparisons valid).
- [Bots make ratings farmable] Beating weak bots repeatedly could inflate ratings → bots are matched to the player's
  rating, so expected score stays ~even; monitor and cap bot-only rating gains if needed.
- [Clock skew] Client countdown uses remaining ms, not absolute time → drift only affects display, the server decides.
- [Hot takeover fights] Two tabs reconnecting alternately → the newest connection wins, older gets `takenOver` and does
  not auto-reconnect.

## Migration Plan

1. Merge the migrations (ratings, games) — the web app applies them on its next start.
2. Replace the current Dokploy **Application** (Dockerfile) with a **Docker Compose** application from the same repo
   (compose path `compose.production.yml`): copy the web env vars to it, add `WEB_INTERNAL_URL=http://web:3000`, add
   the domain twice (path `/` → `web`, port 3000; path `/ws` → `game-server`, port 3001), deploy, then remove the old
   application. DNS is unchanged; expect a short switch-over while Traefik moves the domain.
3. The "Play online" entry only appears when the game server is reachable, so the web app can ship before it works.
4. Rollback: remove the `/ws` domain (or stop the `game-server` service); the web app keeps working (offline play,
   accounts). Tables can stay. Going back to a plain Application deploy only needs the old settings.

## Open Questions

- Confirm the bot anchor (skill 0.15 = 1000) and the rating-based hint thresholds.
- Timer defaults (8 s / 5 s / 15 s bank per hand) need play-testing on phones.
- Should a player be able to leave a running game to a bot and immediately queue again (currently no)?
- When the replay UI arrives, should opponents' hands be revealed in replays (spoiler-free for the player themself)?
