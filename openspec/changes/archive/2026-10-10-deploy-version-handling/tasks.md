## 1. Engine version

- [x] 1.1 Export `ENGINE_VERSION = 2` from `@mahjong/engine`, with a comment giving the bump rule (bump when old action logs would replay differently)
- [x] 1.2 Replace `SAVE_VERSION` in `apps/web/src/lib/game/saved.ts` with `ENGINE_VERSION`, delete `SAVE_VERSION`, and grep for leftovers
- [x] 1.3 Update the version lines in AGENTS.md, `docs/agents/engine.md`, `web.md` and `fair-play.md`

## 2. Stored engine version

- [x] 2.1 Migration `apps/web/migrations/0008_engine_version.ts`: add `game.engineVersion` integer not null, defaulting to 2 for existing rows, then drop the default
- [x] 2.2 `apps/game-server/src/db.ts`: add `engineVersion` to `GameTable` and move `REQUIRED_MIGRATION` to `0008_engine_version`
- [x] 2.3 `store.ts`: `createGame` writes `ENGINE_VERSION`, `StoredGame` carries `engineVersion` (PgStore and MemoryStore)

## 3. Recovery and the cancelled cue

- [x] 3.1 `Hub.recover`: abort games whose `engineVersion` differs without replaying them, and keep the try/catch around replay
- [x] 3.2 `Hub`: keep a map in memory from user id to aborted game id for the human seats of aborted games, send it once as `welcome.abortedGame` and delete it
- [x] 3.3 `@mahjong/protocol`: add optional `abortedGame?: string` to `welcome` (no `PROTOCOL_VERSION` bump; server messages have no guard)
- [x] 3.4 Game-server tests: version mismatch aborts without replay, ratings stay unchanged, the aborted player gets `abortedGame` exactly once, and a matching version still resumes
- [x] 3.5 Update the recovery section of `docs/agents/game-server.md`

## 4. Client reloads

- [x] 4.1 `remote.svelte.ts`: on `badVersion`, stop reconnecting and reload through a 60 s sessionStorage guard (try/catch, no storage = no reload)
- [x] 4.2 `remote.svelte.ts`: on a `welcome` that isn't the first, `await updated.check()` and reload through the same guard if it returns true
- [x] 4.3 Put the guard in a small pure helper with unit tests (reloads when there's no stamp, stops within 60 s, reloads after 60 s, and doesn't reload without storage)
- [x] 4.4 `apps/web/svelte.config.js`: `kit.version.pollInterval: 300_000`
- [x] 4.5 Client: on `welcome.abortedGame`, clear the stale game and show a short "Cancelled · unrated" cue in the lobby, using the design system's pattern
- [x] 4.6 Note the reload behaviour in `docs/agents/web.md`

## 5. Verify

- [x] 5.1 `npm test` and `npm run typecheck` pass, and a mutation check on the new tests (plant a bug in the version comparison and in the reload guard)
- [x] 5.2 Browser check on localhost: rejoin after a game-server restart without a reload; bump `ENGINE_VERSION` locally and restart to see the cancelled cue; force `badVersion` and check that the page reloads once and doesn't loop. Stop the dev servers afterwards
