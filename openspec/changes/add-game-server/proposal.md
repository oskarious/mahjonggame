## Why

Games currently run entirely in the player's browser (`LocalGame`), so nothing a game produces can be trusted: the
client holds the wall and every hand, results can't be rated, and there is no way to play against other people.
Accounts now exist, which was the last prerequisite for rated, server-authoritative play — the core of a chess.com-style
site.

## What Changes

- New `apps/game-server`: a Node WebSocket service (reached at `/ws` on the site's domain) that runs games with
  `@mahjong/engine` as the single source of truth and sends each player only their redacted view (`viewFor` /
  `redactEvent`).
- Quick-play matchmaking for signed-in players: pick a format (East-only / East+South), get seated with other waiting
  players near your rating, and have empty seats filled by bots at a matching strength after a short wait.
- Turn timers with a per-player time bank; timeouts play the engine's `timeoutAction`. Disconnected players are
  replaced by a bot until they reconnect and resume their seat.
- Elo ratings: every finished online game updates the human players' ratings (bots are fixed-rated anchors from the
  calibration table). New players start at 1000. Hint level for online games is chosen by the server from the
  player's rating.
- Game records in Postgres: each game's rules, seed, seats and action log are stored as they happen, so games can be
  replayed, audited, and resumed after a server restart.
- Shared protocol package (`packages/protocol`) with the typed client↔server messages, used by both the web app and the
  game server.
- Web app: a "Play online" entry on the home screen (signed-in users), a queue screen, and a `RemoteGame` client with
  the same shape as `LocalGame` so the existing table UI is reused unchanged. Offline bot play and guests stay as they
  are. Debug controls (show bots' hands, autoplay) are not available in online games.
- New database tables (ratings, games, game seats, game actions) via the existing Kysely migrations in `apps/web`.
- Deployment: the Dokploy deployment becomes one Docker Compose application with two containers (web and game
  server, each with its own Dockerfile), routed on the same domain at `/` and `/ws`; the Vite dev server proxies `/ws`
  so development stays same-origin.

## Capabilities

### New Capabilities
- `online-play`: server-authoritative online games over WebSocket — authentication of the connection, per-seat
  redacted views, action validation, turn timers and time bank, disconnection/reconnection with bot takeover, one active
  game per player, and the web client for it.
- `matchmaking`: the quick-play queue — formats, rating-based grouping, bot fill after a wait, leaving the queue.
- `ratings`: Elo ratings for players — starting value, update after each game from placements, bots as fixed-rated
  opponents, rating shown to the player, rating-based hint level.
- `game-records`: persisting games (rules, seed, seats, actions, result) as they are played, resuming unfinished games
  after a restart, and the record staying replayable with the engine.

### Modified Capabilities
<!-- None: openspec/specs/ has no archived capabilities yet. The pending add-user-accounts change is consumed, not
     modified (its session lookup is used to authenticate the WebSocket). -->

## Impact

- **New code**: `apps/game-server` (Node 22, `ws`, Kysely + `pg`), `packages/protocol`.
- **Web app**: home screen entry, queue route, `RemoteGame` client, rating display, Vite `/ws` proxy, new migrations
  and schema types; no change to offline play.
- **Engine**: none expected beyond possibly small helpers (e.g. serialisation). Bot Elo table may be re-anchored so a
  new player's 1000 corresponds to a beginner bot (see design).
- **Database**: new tables for ratings and game records; migrations still owned and run by the web app.
- **Deployment**: `compose.production.yml` (web + game-server) replaces the single-Dockerfile Dokploy application with
  one Dokploy Compose application; new Dockerfile for the game server, `/ws` path routing on the same domain, one set of
  env vars (adds the internal web URL); games survive restarts via stored actions.
- **Dependencies**: `ws` (game server). No new client dependencies.
