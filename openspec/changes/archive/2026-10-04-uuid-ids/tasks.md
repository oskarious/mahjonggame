## 1. Shared UUID check

- [x] 1.1 Add `isUuid(v: unknown): v is string` to `@mahjong/protocol` (8-4-4-4-12 hex, case-insensitive) and export it
- [x] 1.2 Replace `isId` with `isUuid` for `gameId` in the `act`/`ready` guards (`packages/protocol/src/guards.ts`); remove `isId` if unused
- [x] 1.3 Update `packages/protocol/test/guards.test.ts` (`'g1'` → UUIDs) and add a case rejecting a malformed `gameId`; update any game-server tests that send non-UUID game ids

## 2. Migration 0006_uuid_ids

- [x] 2.1 Create `apps/web/migrations/0006_uuid_ids.ts` (imports only from `kysely`): drop FKs referencing `user.id`/`game.id`, looked up by name in `pg_constraint`
- [x] 2.2 Remap non-UUID `user.id`s via a temp `user_id_map` and rewrite `session`, `account`, `rating`, `game_seat`, `bot`, `daily_discard_vote` references
- [x] 2.3 Give `session.id`, `account.id`, `verification.id` fresh UUID values
- [x] 2.4 `alter column … type uuid using …::uuid` for every column listed in the spec (including `daily_discard_vote.guestId`); add `default gen_random_uuid()` to the four auth `id` columns
- [x] 2.5 Recreate the FKs with explicit names and the original `on delete` rules; check that the `daily_discard_vote` unique constraints and the existing indexes survived
- [x] 2.6 Write `down`: types back to `text`, drop the defaults (old human ids are not restored; say so in a comment)
- [x] 2.7 Register the migration wherever 0005 is registered (web migration list / `scripts/migrate.ts` glob)

## 3. Better Auth and web app

- [x] 3.1 Set `advanced.database.generateId: 'uuid'` in `apps/web/src/lib/server/auth.ts`
- [x] 3.2 `voterOf` in `apps/web/src/lib/server/daily-discard.ts`: treat a cookie that is not a UUID (hyphenated or legacy 32-hex) as absent; issue new guest ids with `crypto.randomUUID()`; keep `randomId` (still used by `/play` seeds)
- [x] 3.3 Update comments in `apps/web/src/lib/server/schema.ts` that describe id formats

## 4. Game server

- [x] 4.1 `apps/game-server/src/db.ts`: update the column comments and set `REQUIRED_MIGRATION = '0006_uuid_ids'`
- [x] 4.2 Admin `PATCH /internal/bots/:id`: answer 404 "No such bot" for a non-UUID id before touching the DB; add a test in `apps/game-server/test`

## 5. Verify against local Postgres

- [x] 5.1 Before migrating, record a human user's username, rating, game count, vote and session token in the local DB (`mahjong2-postgres-1`)
- [x] 5.2 Run `npm run db:migrate --workspace @mahjong/web`; check the `information_schema.columns` types against the spec list and that `game.seed` is still `text`
- [x] 5.3 Check that the human user from 5.1 has a UUID id with rating, `game_seat` rows, vote, account and session all pointing to it; a bot's and a game's ids are unchanged
- [x] 5.4 Run `down` then `up` again on a copy (or a fresh DB) to make sure both directions run
- [x] 5.5 Dev servers (launch configs web-5175 + game): stay signed in as the existing user, sign up a new account (UUID ids in `user`/`account`/`session`), play an online game against bots, vote as a guest with an old 32-hex cookie and with a tampered cookie; stop the dev servers afterwards
- [x] 5.6 `npm test` and `npm run typecheck` pass

## 6. Docs and cleanup

- [x] 6.1 Add the deploy note (back up first, deploy with no rated human games running) to `docs/agents/deployment.md`; note UUID ids and `isUuid` in `docs/agents/web.md` / `game-server.md` where the DB is described
- [x] 6.2 Grep for anything this made obsolete (`isId`, "text id" comments, id-format assumptions in tests) and remove it
