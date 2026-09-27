## 1. Database setup

- [x] 1.1 Add root `docker-compose.yml` with a `postgres:17-alpine` service (user/db `mahjong`, port 5432, named volume)
- [x] 1.2 Add `apps/web/.env.example` (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`) and git-ignore `.env`
- [x] 1.3 Add `better-auth`, `kysely` (same version Better Auth uses) and `pg` to `apps/web` `dependencies`, `@types/pg` to devDependencies; move `@mahjong/engine` to devDependencies so it stays bundled
- [x] 1.4 Create `src/lib/server/db.ts` (pg pool from `$env/dynamic/private` `DATABASE_URL` + typed `Kysely<DB>`) and `schema.ts` (table types)

## 2. Auth configuration

- [x] 2.1 Create `src/lib/server/auth.ts`: `betterAuth` on the Kysely instance, `emailAndPassword` (no verification, 8–128 chars, autoSignIn), `username` plugin (3–20, `[A-Za-z0-9_]`, small reserved-name denylist), `deleteUser` enabled, 7-day sliding sessions, rate limit rules for sign-in/sign-up, `x-forwarded-for` IP header, `sveltekitCookies(getRequestEvent)` last
- [x] 2.2 Base URL: prod from `BETTER_AUTH_URL` or `ORIGIN` (required); dev uses a dynamic base URL limited to localhost and private-LAN hosts over HTTP
- [x] 2.3 Write `migrations/0001_auth.ts` (Kysely schema builder) matching Better Auth's generated schema; verify with Better Auth's `getMigrations` that nothing is missing

## 3. Migrations

- [x] 3.1 Write `src/lib/server/migrate.ts`: Kysely `Migrator` (from `kysely/migration`) with an in-memory provider; server bundles `/migrations/*.ts` via `import.meta.glob(..., { eager: true })`
- [x] 3.2 Add `db:migrate` script to `apps/web` that runs the same migrations standalone against `DATABASE_URL`; include `migrations/` and `scripts/` in svelte-check
- [x] 3.3 Verify: fresh DB → tables created; second run is a no-op

## 4. SvelteKit wiring

- [x] 4.1 Type `App.Locals` (`user`, `session`, nullable) in `app.d.ts`
- [x] 4.2 Create `src/hooks.server.ts`: `init` runs migrations then imports auth (Better Auth caches a schema mismatch); `handle` fills `locals` from `auth.api.getSession` and delegates to `svelteKitHandler`
- [x] 4.3 Add root `+layout.server.ts` returning only `{ id, name }` (or `null`) for the current user
- [x] 4.4 Create `src/lib/auth-client.ts` with `createAuthClient({ plugins: [usernameClient()] })`
- [x] 4.5 Confirm `/healthz` still does not touch the database

## 5. UI

- [x] 5.1 `/login`: `+page.server.ts` redirects signed-in users to `/account`; page with Sign in / Sign up segmented control, correct `autocomplete` attributes, `signIn.username` vs `signIn.email` by `@`, generic error line, safe relative `next` redirect
- [x] 5.2 `/account`: `+page.server.ts` redirects guests to `/login?next=/account`; shows display username + email, change password (revoke other sessions), sign out, delete account with password confirmation
- [x] 5.3 Home page: compact account chip (`Sign in` or display username → `/account`); play form unchanged
- [x] 5.4 Style with existing tokens/buttons; check portrait layout at 375 px wide and minimal text

## 6. Verification

- [x] 6.1 Browser pass: sign up, reload (session persists), sign out, sign in by username (other casing) and by email, wrong password shows generic error
- [x] 6.2 Username rules: taken-in-other-case, too short, invalid characters, reserved name all rejected; display casing shown
- [x] 6.3 Change password (old fails, new works, second session revoked); delete account (wrong password refused; correct removes user/sessions/accounts and frees the username)
- [x] 6.4 Check DB: password stored only as hash; session cookie is HttpOnly and not visible in `document.cookie`
- [x] 6.5 Confirm rate limiting in the production image (per client IP)
- [x] 6.6 Guest flow: start a bot game while signed out, unchanged
- [x] 6.7 `npm run typecheck` and `npm test` pass

## 7. Deployment and docs

- [x] 7.1 Update `Dockerfile`: `deps` stage with `npm ci --omit=dev --workspace @mahjong/web`; runtime runs `node apps/web/build`
- [x] 7.2 `docker build` and run the image against a fresh database with `DATABASE_URL`/`BETTER_AUTH_SECRET`/`ORIGIN`; confirm migrations run, `/healthz` OK, sign-up works, Secure cookie behind https ORIGIN, missing ORIGIN fails fast
- [x] 7.3 Update AGENTS.md: layout, commands (`docker compose up -d`, `db:migrate`), env vars, Dokploy Postgres service, gotchas, "Where this is going"
- [x] 7.4 Update the project memory note that said "no accounts/auth for now"
