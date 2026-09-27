## Context

`apps/web` is a SvelteKit (Svelte 5, adapter-node) app with no server-side state: bot games run fully in the browser
(`LocalGame`). There is no database. Production is a single VPS with Dokploy building the root `Dockerfile`, whose
runtime stage ships only `apps/web/build` (no `node_modules`). Phone testing uses the dev server over plain HTTP on the
LAN, which is not a secure context. The planned `apps/game-server` (WebSocket at `/ws`, same domain) will need to
authenticate players, and Postgres is already the planned store for players, ratings and game logs.

## Goals / Non-Goals

**Goals:**
- Username/email/password accounts with Better Auth on Postgres, no email verification or sending.
- Sessions available in `event.locals` everywhere in SvelteKit; reusable session lookup for the future game server.
- One migration mechanism that later tables (ratings, games) reuse.
- Dev setup is one `docker compose up -d` away; production deploy is documented and works with Dokploy.
- Guests keep playing with zero friction.

**Non-Goals:**
- Password reset, email verification/change, OAuth, 2FA, passkeys, admin roles, profiles, ratings.
- Moving bot games server-side.

## Decisions

### 1. Kysely for data access, shared with Better Auth
`src/lib/server/db.ts` creates one `pg.Pool` and a typed `Kysely<DB>` on it (`PostgresDialect`); table types live in
`src/lib/server/schema.ts`. Better Auth gets the same instance via `database: { db, type: 'postgres' }`, so there is one
pool and one query layer. `kysely` is a direct dependency pinned to the version Better Auth uses (one copy in the tree).
- *Alternatives*: raw `pg` (no types, hand-rolled migrations — the first cut of this change), Drizzle or Prisma (heavier;
  Prisma adds a binary engine). Kysely is what Better Auth runs on internally anyway.

### 2. Plugins and options
- `emailAndPassword: { enabled: true, requireEmailVerification: false, minPasswordLength: 8, maxPasswordLength: 128,
  autoSignIn: true }`. No `sendResetPassword` / `emailVerification` config at all.
- `username` plugin: `minUsernameLength: 3`, `maxUsernameLength: 20`, `usernameValidator` =
  `/^[A-Za-z0-9_]+$/`. The plugin stores a normalised lowercase `username` (unique) and the original in
  `displayUsername`; the UI always shows `displayUsername`. Sign-in form calls `signIn.username` when the input has
  no `@`, otherwise `signIn.email`.
- `name` (required by Better Auth core) is set to the display username on sign-up; we don't expose it separately.
- `user.deleteUser: { enabled: true }` — Better Auth requires the password when no email verification callback is set.
- `changePassword` via the client with `revokeOtherSessions: true`.
- `session.expiresIn` 7 days, `updateAge` 1 day (sliding).
- `rateLimit`: built-in, memory storage (single instance), enabled in production; stricter custom rule for
  `/sign-in/*` and `/sign-up/*` (e.g. 5 per 60 s).
- `advanced.ipAddress.ipAddressHeaders: ['x-forwarded-for']` because Traefik sits in front in production.
- `sveltekitCookies(getRequestEvent)` plugin (last in the list) so cookies set from form actions/server code work.

### 3. SvelteKit integration
- `src/lib/server/auth.ts`: exports `auth`, the single place the future game server imports (or copies config from) to
  call `auth.api.getSession({ headers })`. Env via `$env/dynamic/private` (runtime, not build-time).
- `src/hooks.server.ts`: `init` runs migrations, **then** dynamically imports the auth module (Better Auth validates
  the schema when `betterAuth()` runs and caches a mismatch until *it* migrates, so creating it before our migrations
  left a fresh database permanently broken). `handle` fills `event.locals.user` / `session` (typed in `app.d.ts`),
  skipping `/healthz` and `/api/auth/*`, then delegates to `svelteKitHandler`.
- `src/lib/auth-client.ts`: `createAuthClient({ plugins: [usernameClient()] })` from `better-auth/svelte`; same origin.
- Root `+layout.server.ts` returns `{ user: { id, name } | null }` (name = display username) — only public fields.
- `/login` and `/account` call the auth client from the browser (inline errors, no reloads), then
  `goto(…, { invalidateAll: true })`. Guards are in their `+page.server.ts` `load`. `next` is honoured only for
  same-site relative paths (`$lib/safe-next.ts`). Error codes map to short messages in `$lib/auth-errors.ts`; sign-in
  failures stay generic.
- *Alternative*: form actions calling `auth.api.*` server-side. Works without JS, but the play UI requires JS anyway.

### 4. Base URL, origin and secure cookies (dev LAN gotcha)
- Production: `baseURL` = `BETTER_AUTH_URL` or `ORIGIN` (startup throws if neither is set) → `__Secure-` HttpOnly
  cookies and a strict Origin check.
- Dev: Better Auth's dynamic base URL `{ allowedHosts: ['localhost:*', '127.0.0.1:*', '10.*', '192.168.*', '172.*'],
  protocol: 'http' }` — derived per request, so both localhost and a phone on the LAN work over plain HTTP with
  non-Secure cookies; foreign origins still get 403.
- Nothing on the client needs a secure context; ids are generated server-side.

### 5. Migrations: Kysely Migrator
- `apps/web/migrations/NNNN_name.ts` export `up`/`down` using Kysely's schema builder and import only from `kysely`.
  `0001_auth.ts` mirrors the schema Better Auth generates for emailAndPassword + username (verified: Better Auth's
  `getMigrations` reports nothing to create or add).
- `src/lib/server/migrate.ts` wraps `Migrator` (from `kysely/migration`) with an in-memory provider: history in
  `kysely_migration`, lock table + advisory lock, pending batch in one transaction on Postgres.
- The server bundles migrations with `import.meta.glob('/migrations/*.ts', { eager: true })` and runs them in `init`,
  so the runtime image needs no migration files. `npm run db:migrate` runs the same code with plain Node (type
  stripping) for dev. `migrations/` and `scripts/` are added to svelte-check via `kit.typescript.config`.
- *Alternatives*: Better Auth's `migrate` CLI (auth tables only, needs the CLI in the image); plain SQL files with a
  hand-rolled runner (the first cut); auto-diffing at startup (too implicit for production).

### 6. Docker image ships production `node_modules`
`better-auth`, `pg` and `kysely` are `dependencies` of `apps/web` and stay external to the adapter-node build. A `deps`
stage runs `npm ci --omit=dev --workspace @mahjong/web`; the runtime copies root and workspace `node_modules` plus
`apps/web/build` and runs `node apps/web/build` (npm may nest packages under `apps/web/node_modules`, so the build must
live under `apps/web` to resolve them). `@mahjong/engine` moved to `devDependencies` so it stays bundled.
- *Alternative*: bundle everything (`ssr.noExternal`) — fragile with `pg`'s optional native require and Better Auth's
  many dialects.

### 7. Health check stays DB-independent
`/healthz` keeps returning OK without touching Postgres, so a DB blip doesn't make Dokploy restart-loop the web app.
Startup still fails fast if migrations can't run (bad `DATABASE_URL`).

### 8. Local Postgres via compose
Root `docker-compose.yml` with a single `postgres:17-alpine` service (`mahjong`/`mahjong`, port 5432, named volume).
`apps/web/.env.example` documents `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`; `.env` is git-ignored.
Vite loads `apps/web/.env` in dev.

### 9. UI
Minimal and portrait-first, reusing `app.css` tokens and existing `.btn` styles:
- Home: small top-right chip — `Sign in` or the display username → `/account`.
- `/login`: segmented control Sign in / Sign up (like the home page's segmented controls); fields; one primary
  button; inline error line. No explanatory copy.
- `/account`: username + email, change-password form (collapsed until tapped), Sign out, Delete account (requires
  password; destructive styling).
- Inputs get correct `autocomplete` (`username`, `email`, `current-password`, `new-password`) so password managers
  work.

## Risks / Trade-offs

- [No password reset] A user who forgets their password loses the account → accept for now; emails are collected so
  reset can be added once an email service exists. Admin can reset manually via SQL/Better Auth API in emergencies.
- [Unverified emails] Someone can register with another person's email, blocking it → acceptable while email is
  only an identifier; when verification is added, unverified duplicates can be resolved then.
- [In-memory rate limit] Resets on restart and doesn't span instances → fine for one container; switch to
  `storage: 'database'` if we scale out.
- [Migrations at startup] A bad migration prevents the app from starting → the pending batch runs in one transaction;
  Dokploy keeps the old container running if the new one fails its health check; test migrations against the dev DB
  first.
- [Better Auth schema changes on upgrade] Upgrades may need new columns → Better Auth logs a "schema mismatch" on
  startup; add a numbered Kysely migration for the difference (`getMigrations` from `better-auth/db/migration` shows it).
- [Bigger image / npm ci in runtime stage] Slightly slower builds → cached layer keyed on lockfile.
- [Dev origin allowance] Trusting LAN origins only applies when `dev` is true; production uses strict `baseURL`.

## Migration Plan

1. Dokploy: create a Postgres service on the same network; note its internal URL.
2. Web app env: `DATABASE_URL`, `BETTER_AUTH_SECRET` (≥ 32 random bytes), `ORIGIN=https://<domain>` (used as
   `BETTER_AUTH_URL`), `ADDRESS_HEADER=X-Forwarded-For`, `XFF_DEPTH=1`.
3. Push to `master`; first start creates `kysely_migration` and the auth tables.
4. Rollback: redeploy the previous commit — it ignores the new tables. Drop them only if abandoning the feature.

## Open Questions

- Should usernames be changeable later (id-based references make it possible; rate-limit renames)? Not in this change.
- Reserved usernames: implemented as a small denylist (`admin`, `guest`, `you`, `bot*`, …) in `$lib/username.ts`.
- Ratings were requested during implementation and deferred to the game server change (see proposal non-goals).
