## Why

Everything planned next — Elo for humans, matchmaking, the WebSocket game server, stored game logs — needs a stable
player identity. Today there is none: games run in the browser and nobody is remembered. Adding accounts now, before
the game server, lets the server authenticate WebSocket connections with the same session from day one instead of
retrofitting identity onto "pick a display name".

## What Changes

- Introduce **Postgres** as the site's database (first persistent storage in the project), with a small migration
  mechanism (Kysely migrations) that later tables (ratings, game logs) will reuse; Kysely is the typed query layer.
- Add **Better Auth** to `apps/web` (SvelteKit handler + session in `event.locals`).
- **Sign up** with username + email + password; **sign in** with username *or* email + password. **No email
  verification** and no email sending of any kind (no email server exists yet).
- **Username** is the public handle (unique, case-insensitive; display casing kept).
- **Account page**: see your username/email, change password, sign out, delete account.
- **Guest play stays**: playing vs bots requires no account. Signed-in users just see their name where "you" appears
  in the lobby chrome.
- Local dev gets a Postgres container (`docker compose`); production gets Postgres as a Dokploy service.
- Docker image changes: runtime now needs production `node_modules` (DB driver, Better Auth) and new env vars
  (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `ORIGIN`).
- Supersedes the earlier decision "no accounts/auth for now; players just pick a display name".

## Non-goals

- Password reset / forgot password, email verification, email change (all need email delivery).
- OAuth / social login, 2FA, passkeys.
- Ratings, game history, profiles, admin roles — they build on this but are separate changes. Ratings in particular
  wait for the server-authoritative game server: bot games run in the browser, so a result reported from the client
  can't be trusted (and a replayable seed would leak the wall).
- Wiring identity into the (not yet existing) game server; this change only keeps that path open.

## Capabilities

### New Capabilities
- `user-accounts`: registering, signing in/out, sessions, username rules, changing password and deleting an account,
  and the guarantee that guests can still play.

### Modified Capabilities
<!-- none: openspec/specs/ is empty -->

## Impact

- **Code**: `apps/web` — new `src/hooks.server.ts`, `src/lib/server/{db,auth}.ts`, auth client, `/login` and
  `/account` routes, a small account entry point on `/`; `app.d.ts` gets `Locals` types.
- **Dependencies**: `better-auth`, `kysely`, `pg` (+ `@types/pg`) in `apps/web`.
- **Infra**: `docker-compose.yml` (dev Postgres), Dockerfile runtime stage, Dokploy Postgres service + env vars,
  AGENTS.md (layout, commands, deployment, "where this is going").
- **Engine**: untouched.
