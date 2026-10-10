## Why

Deploys leave players on outdated code in two ways. A client whose protocol version the new game server rejects
(`badVersion`) reconnects forever and shows "connecting" until the player reloads. A compatible client keeps running the
old UI indefinitely. On the server, running games are recovered by replaying their log with the new engine and are
aborted only if the replay throws. A rule or scoring change that keeps every logged action legal silently finishes the
game under mixed rules, and the result is rated.

## What Changes

- The online client reloads the page when the game server rejects its protocol version, with a guard so a mismatched
  deploy can't cause a reload loop.
- After a websocket reconnect (not the first connection), the client checks whether a new web build is live and
  reloads if so. A reconnect without a new build changes nothing.
- SvelteKit polls for new builds (`kit.version.pollInterval`), so pages that stay open pick up a new build on their
  next navigation.
- One engine-level `ENGINE_VERSION` replaces the web app's `SAVE_VERSION`. It is bumped when old action logs would
  replay differently, and covers both offline saves and online games.
- Each online game stores the engine version it started under (`game.engine_version`). On startup, recovery aborts
  (unrated) running games whose version differs, without replaying them. Aborting on a failed replay stays.
- A player whose game was aborted sees a short "game cancelled, unrated" cue on reconnect, instead of landing silently
  in the lobby.

Out of scope: draining games before shutdown on SIGTERM.

## Capabilities

### New Capabilities
- `client-updates`: how open pages move to a new deploy (reload on protocol mismatch, on reconnect with a new build,
  and on navigation after polling).

### Modified Capabilities
- `game-records`: "Resume after restart" gains the engine-version check, and the aborted player gets told.
- `online-play`: "Deploys do not destroy games" now carves out deploys that change engine behaviour.

## Impact

- `packages/engine`: exports `ENGINE_VERSION`.
- `packages/protocol`: optional `welcome.abortedGame` field. It is additive, so `PROTOCOL_VERSION` is not bumped.
- `apps/game-server`: stores `engine_version` on game creation (`store.ts`, `db.ts`), checks the version in
  `hub.recover`, keeps the ids of aborted players in memory, and sends the field in `welcome`.
- `apps/web`: a migration adds `game.engine_version`. Also touched: `remote.svelte.ts` (`badVersion` handling, reload
  check on reconnect), `svelte.config.js` (poll interval), `saved.ts` (uses `ENGINE_VERSION`), and the online table UI
  for the cancelled cue.
- Docs: AGENTS.md, `docs/agents/{engine,web,game-server,fair-play}.md` lines about `SAVE_VERSION` and recovery.
