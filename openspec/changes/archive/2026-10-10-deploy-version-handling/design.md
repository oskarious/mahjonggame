## Context

The web app and the game server deploy together as one Dokploy Compose app, but they don't restart at exactly the same
moment. Every game-server restart closes all sockets (`server.restarting`), and clients reconnect with backoff
(`RemoteGame.#scheduleReconnect`).

- **Protocol.** `hello.version` is checked against `PROTOCOL_VERSION`. On a mismatch the server sends
  `error{code:'badVersion'}` and closes the socket. The client ignores the code, and `onclose` schedules another
  reconnect, so the player sees "connecting" forever.
- **Web build.** The client never checks for a new build, so an open tab keeps its old code until the player reloads.
- **Recovery.** `Hub.recover` replays each running game and aborts it only if the replay throws.
  `GameTable.status: 'aborted'` and `Store.abortGame` already exist. Ratings are written only when a game finishes, so
  an aborted game needs no refund.
- **Offline saves.** `saved.ts` has `SAVE_VERSION = 2` with the rule "bump it when old logs replay differently". That
  is the same condition online games need.
- **The cancelled cue.** After an abort, `welcome.activeGame` is null. The client can't tell that apart from a game
  that ended normally while it was away, so the server has to say that the game was aborted.

## Goals / Non-Goals

**Goals:**
- No player ever sits on an endless "connecting" screen after a deploy.
- Open tabs move to a new build at moments when the reload costs nothing: right after a reconnect, or on the next
  navigation.
- A rated game is never finished under different engine rules than it started with.
- One version number to bump, one rule.

**Non-Goals:**
- Draining games before shutdown.
- Keeping old engine versions around so old games can finish under their own rules.
- A version handshake between web and the game server (they share the protocol package).

## Decisions

**1. Reload on `badVersion`, with a guard in sessionStorage.** On `badVersion`, the client stops its reconnect loop.
If `sessionStorage['riichi:reloadedAt']` holds a time less than 60 s ago, it goes to a new `outdated` status (a
Reload button in the lobby slot) instead of the endless connecting dots. Otherwise it writes the
current time and calls `location.reload()`. sessionStorage is per tab and survives a reload, and the read and write are
wrapped in try/catch: without storage the client goes `outdated` instead of reloading, which still beats looping. Alternative:
a query parameter, rejected because it leaks into the URL and history.

**2. Check `updated` only on a reconnect.** `RemoteGame` remembers whether a socket has ever reached `welcome`. When a
later socket gets its `welcome`, it calls `updated.check()` from `$app/state` (SvelteKit 2.70). If that returns true,
it reloads, through the same 60 s guard. Waiting for `welcome` (instead of `onopen`) means the game server is back and
the seat exists again when the page reloads. The cost is one small fetch of `_app/version.json` per reconnect.
Alternatives considered:
- Reload on every reconnect: rejected, since most reconnects are phone network blips.
- Have the game server announce the web build: rejected, because it couples the two apps' builds.

**3. `kit.version.pollInterval: 300_000`.** SvelteKit then does a full page load on the next client navigation after it
sees a new version. This covers the lobby, Learn, trainers and offline play with no code of our own. An offline game
reloads only when the player navigates, and is then restored from its autosave.

**4. `ENGINE_VERSION` lives in `@mahjong/engine`.** The engine is what decides whether a log replays the same way, so
the constant belongs there. It starts at 2, the current `SAVE_VERSION`, so existing offline saves stay valid.
`saved.ts` imports it, `SAVE_VERSION` is deleted, and the docs say "bump `ENGINE_VERSION`" everywhere. Alternative:
two constants, rejected because they'd always be bumped together, and forgetting one is exactly the bug.

**5. `game.engineVersion` column.** It is an integer, not null. Migration `0008_engine_version` adds it with a default
of 2 for existing rows, then drops the default, so every insert has to set it. Existing running games count as
created under 2, which is true today. `REQUIRED_MIGRATION` moves to the new migration and `GameTable` gains the field.
`createGame` writes `ENGINE_VERSION`, and `StoredGame` carries it.

**6. Recovery checks the version before replaying.** In `Hub.recover`, a game whose `engineVersion !== ENGINE_VERSION`
is aborted without being replayed: replaying it could succeed and then produce a wrong game. The try/catch around the
replay stays as a second line of defence.

**7. The cancelled cue goes in `welcome`.** `Hub` keeps a map in memory from user id to aborted game id, filled by
`recover` for every human seat of each aborted game. `attach` puts the entry into `welcome.abortedGame` (an optional
gameId) and deletes it. The field is optional and additive, so `PROTOCOL_VERSION` is not bumped, and old clients
ignore it. The client clears its stale `info` and `view` and shows a short cue in the lobby (an icon plus "Cancelled ·
unrated"), following the design system's toast or banner pattern. Alternatives considered:
- A separate `game.aborted` message: rejected, since the information belongs to connecting.
- Persisting the pending cue in the DB: rejected. If the server restarts again before the player reconnects, the cue
  is lost, and that's acceptable.

## Risks / Trade-offs

- [The web build and game server roll out at different moments] → The 60 s guard prevents a reload loop. Once both
  are up, the next reconnect or navigation catches up.
- [A reload mid-turn costs about a second of the turn timer] → It only happens right after a disconnect that was
  already costing time. Server timers are unchanged.
- [`updated.check()` fails while web restarts] → It is treated as "no update". The poll and the next reconnect catch
  up.
- [Someone forgets to bump `ENGINE_VERSION`] → Same risk as today with `SAVE_VERSION`, now in one place. The replay
  try/catch still catches illegal actions. The Tenhou replay harness and the engine tests are where behaviour changes
  show up, and engine.md says to bump the version when they do.
- [Every running game is aborted on a deploy that bumps the version] → This is intended. It should be rare once the
  rules settle, and draining is the later fix if it isn't.

## Migration Plan

Deploy as usual: web runs migration `0008` on start, and the game server refuses to start until the migration is
applied (`REQUIRED_MIGRATION`). This change itself doesn't bump `ENGINE_VERSION`, so no games are aborted by this
deploy. Rollback: the old game server ignores the extra column. The old client ignores `abortedGame`.
