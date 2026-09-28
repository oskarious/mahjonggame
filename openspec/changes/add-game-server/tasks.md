## 1. Bot rating anchor

- [x] 1.1 Change the calibration anchor in `packages/engine/scripts/calibrate.ts` to skill 0.15 = 1000 and shift `src/bot-ratings.ts` by the same constant (header comment updated)
- [x] 1.2 Update bot-rating tests and the web home presets if they assume the old range; run engine tests and typecheck

## 2. Protocol package

- [x] 2.1 Create `packages/protocol` (workspace package, erasable TS, `.ts` imports) with message types for client→server and server→client as in design §3, a protocol version constant, and format/hint-level types
- [x] 2.2 Add hand-written guards that validate incoming client messages (shape, size limit) with unit tests for valid/invalid messages

## 3. Database

- [x] 3.1 Add Kysely migration `0002_game_server.ts` in `apps/web/migrations` creating `rating`, `game`, `game_seat`, `game_action` with the keys and ON DELETE behaviour from design §10
- [x] 3.2 Add the table types to `apps/web/src/lib/server/schema.ts`; run `npm run db:migrate --workspace @mahjong/web` against the dev DB and verify rollback with `down`
- [x] 3.3 Show rating and rated-game count on `/account` (1000 / 0 when no row exists)

## 4. Game server skeleton

- [x] 4.1 Create `apps/game-server` (package.json with `ws`, `kysely`, `pg`; tsconfig extending the base; `src/main.ts`) serving `/healthz` and the `/ws` upgrade on `PORT` (default 3001)
- [x] 4.2 Config module reading `DATABASE_URL`, `ORIGIN`, `WEB_INTERNAL_URL`, timer/matchmaking/hint defaults; Kysely instance with its own table types; startup check that migration `0002_game_server` is applied
- [x] 4.3 Upgrade authentication: Origin check, cookie forwarded to `{WEB_INTERNAL_URL}/api/auth/get-session`, 401 on failure; tests with a stub session endpoint
- [x] 4.4 Connection handling: `hello`/`welcome`, message guards, 16 KB limit, per-connection rate limit, ping/pong heartbeat (20 s, two misses = dead), `takenOver` for a second connection of the same user
- [x] 4.5 Root `npm run dev` starts web and game server together; Vite proxies `/ws` to `ws://localhost:3001`

## 5. Rooms and timers

- [x] 5.1 `Room` with seats (human/bot), per-room serialized input queue, and the pipeline validate (seat, seq, legality) → persist action → apply → send per-seat `update` (view with seat's hint level + redacted events)
- [x] 5.2 Bot moves with randomized 400–900 ms delay; `ready`/12 s gate between hands; game end: compute standings, store results, send `game.end`
- [x] 5.3 Timers: base 8 s own turn / 5 s call, 15 s bank reset each hand, `deadline` in updates, `timeoutAction` on expiry; unit tests with fake timers for within-base, bank use, and timeout (turn and call)
- [x] 5.4 Disconnects: 10 s grace then bot at `skillForElo(rating)`, resume on reconnect, fast-forward games with no human connected for 5 minutes
- [x] 5.5 Tests: redacted updates never contain other seats' concealed tiles or wall tiles; illegal / wrong-seat / stale-seq actions are rejected without state change; no message reveals pending call options to non-deciding players

## 6. Matchmaking

- [x] 6.1 Per-format queue with 1 s tick, rating window `150 + 20/s` (cap 800), immediate start for 4 compatible players, bot fill after 15 s at `skillForElo(mean rating)`, random seating
- [x] 6.2 `queue.join` / `queue.leave` / `queue.status`; refuse queueing while in a game (send the active game instead)
- [x] 6.3 Tests: solo player gets 3 bots after the delay; close ratings grouped before distant ones; window widening; four players start immediately; leaving removes the player

## 7. Ratings

- [x] 7.1 Pure rating module: pairwise Elo from placements with ties, K 40 for the first 20 games then 20, bots fixed at `botElo(skill)`; unit tests from the spec scenarios (stronger opponents, zero-sum among humans, ties, bot games)
- [x] 7.2 Apply rating changes in one transaction with the game result (create rating rows at 1000 on first game); include changes in `game.end`
- [x] 7.3 Hint level from rating thresholds (< 1100 waits, < 1300 distance, else off) with client `hints` able to lower it only

## 8. Records and recovery

- [x] 8.1 Insert `game` + `game_seat` rows at start, one `game_action` row per applied action (awaited before sending), results at end
- [x] 8.2 Startup recovery: load running games, replay actions, rebuild rooms with humans disconnected, restart the pending decision's timer
- [x] 8.3 SIGTERM: stop matchmaking, send `server.restarting`, close sockets, exit
- [x] 8.4 Tests: replaying a finished game's stored actions reproduces the stored standings; a room rebuilt from the database continues identically

## 9. Web client

- [x] 9.1 Extract the table screen from `/play` into a component that takes a game source (`LocalGame` or `RemoteGame`); offline play unchanged (verify on localhost at phone size)
- [x] 9.2 `RemoteGame` (`$lib/game/remote.svelte.ts`): WebSocket to same-origin `/ws`, protocol handling, auto-reconnect with backoff, `takenOver` handling, resync, `act()` with seq, deadline countdown state
- [x] 9.3 `/online` route: format choice → queue screen (waiting time, cancel) → table; redirect guests to `/login`; resume an active game on load
- [x] 9.4 Table additions for online: bot marker and ratings on seats, own countdown/bank indicator, rating change on the final sheet, settings without debug controls or bot strength, hint level from the server
- [x] 9.5 Home: "Play online" with the player's rating for signed-in users (hidden when the game server is unreachable); guests unchanged

## 10. Deployment and docs

- [x] 10.1 `apps/game-server/Dockerfile` (context repo root, prod deps only, non-root, healthcheck, `node apps/game-server/src/main.ts`, port 3001)
- [x] 10.2 `compose.production.yml` with `web` and `game-server` services (build contexts, healthchecks, `restart: unless-stopped`, `dokploy-network`, env passthrough incl. `WEB_INTERNAL_URL=http://web:3000`); run it locally against the dev Postgres and confirm `/` and `/ws` both work through it
- [x] 10.3 End-to-end check on localhost: two browser sessions + bots play a full East-only game online; kill and restart the game server mid-hand and confirm both resume; ratings update
- [x] 10.4 Update `AGENTS.md` (layout, commands, game-server principles, gotchas) and document the Dokploy switch from Application to Compose app (compose path, the two domain entries `/` → web:3000 and `/ws` → game-server:3001, env vars)
