## Context

All ids are `text` (migrations 0001–0005). In local data:

| Column                                                  | What is stored                                       |
| ------------------------------------------------------- | ---------------------------------------------------- |
| `game.id`, `game.seed`                                  | `randomUUID()` (game server `hub.ts`)                |
| `user.id` of bot players                                | `randomUUID()` (game server `store.ts` `createBot`)  |
| `user.id` of human players, `session.id`, `account.id` | Better Auth's default: 32 random `[A-Za-z0-9]` chars |
| `daily_discard_vote.guestId`                            | `randomId()`: 32 hex chars, from a cookie            |

Better Auth 1.7 has `advanced.database.generateId: 'uuid'`. With the Kysely adapter on Postgres (`supportsUUIDs`),
Better Auth leaves `id` out of inserts and expects a database default. Web owns the schema. The game server keeps its
own copy of the table types (`apps/game-server/src/db.ts`) and refuses to start until `REQUIRED_MIGRATION` is applied.
In production, `game-server` `depends_on` a healthy `web`, and web runs its migrations when it starts.

## Goals / Non-Goals

**Goals:**

- One id format: every id column, and every column that references one, is `uuid`.
- No data loss: existing human accounts keep their password, sessions, rating, history and votes.
- A malformed outside id is "not found", not a 500.

**Non-Goals:**

- UUIDv7 / time-ordered ids. `gen_random_uuid()` and `randomUUID()` give v4. Index locality is not a problem at our
  size, and v7 would reveal creation time in game ids. We can revisit this if `game_action` grows large.
- Changing `game.seed` (engine input, `text` on purpose), `daily_discard_vote.id` (bigserial), or natural keys
  (`daily_discard.date`, `setting.key`).
- Branded TypeScript id types. `pg` returns `uuid` as `string`, so the Kysely table types stay `string`.

## Decisions

**1. One migration, `0006_uuid_ids`, in one transaction.** Kysely's Migrator on Postgres runs the pending batch in one
transaction, so a failure leaves the old schema untouched. The steps, in order:

1. Drop the foreign keys that reference `user.id` and `game.id`. Kysely's `.references()` lets Postgres name them,
   and those names are deterministic (`<table>_<column>_fkey`), so the migration uses them directly.
2. Remap human ids: create a temp table `user_id_map(old text, new uuid)` from
   `select id, gen_random_uuid() from "user" where id !~ '<uuid regex>'`. Then update `user.id` and each referencing
   column (`session`, `account`, `rating`, `game_seat`, `bot`, `daily_discard_vote`) via the map. Also rewrite
   `account.accountId` for `credential` accounts. Better Auth sets it to the user id and finds the password by
   `userId` **and** `accountId`, so without this every existing human would be locked out. Browser testing
   found this.
3. `alter column … type uuid using col::uuid` for every id and reference column listed in the spec, including
   `guestId`. Postgres also accepts the hyphen-less 32-hex form, so existing guest ids cast.
4. Add `default gen_random_uuid()` to `user.id`, `session.id`, `account.id` and `verification.id`, which Better Auth
   needs.
5. Recreate the foreign keys with the same names and the same `on delete` behaviour (`cascade`, or `set null` for
   `game_seat.userId`). Also recreate the `daily_discard_vote` unique constraints if the type change requires it.
   `alter type` rebuilds the indexes on its own.

`session.id`, `account.id` and `verification.id` are not referenced anywhere, so they don't need a map. Give them
fresh values with `update … set id = gen_random_uuid()::text` before the cast. A session is found by its `token`, so
the id change doesn't sign anyone out.

`down` reverses the types to `text` (`using col::text`) and drops the defaults. It does not restore the old human ids.
They are gone, and nothing outside the database refers to them.

*Alternative considered:* convert only `game.id` and its references (already all UUIDs, no remap) and leave the auth
tables alone. Rejected: `user.id` is the most referenced id in the schema, so a mixed schema would undercut the point.
The remap is a single transaction while the tables are small.

*Alternative considered:* `on update cascade` foreign keys and a plain `update "user" set id = …`. Rejected: it
changes the constraint definitions anyway (they have to be recreated after the type change), and the explicit map is
easier to read and test.

**2. Better Auth `generateId: 'uuid'`.** Set it in `apps/web/src/lib/server/auth.ts` under `advanced.database`. The
database generates the ids, so Node and Postgres can't disagree about format.

**3. Validate outside ids with one shared helper.** Add `isUuid(v: unknown): v is string` to `@mahjong/protocol`
(a case-insensitive regex for 8-4-4-4-12 hex). Both apps and the guards already depend on that package. Use it in:

- `packages/protocol` guards: `gameId` in `act` and `ready` messages (replaces the 1–64-char `isId`).
- The game server's admin `PATCH /internal/bots/:id`: an id that isn't a UUID returns 404 "No such bot".
- `voterOf` in `apps/web/src/lib/server/daily-discard.ts`: a cookie that isn't a UUID counts as absent. New guest ids
  are generated with `crypto.randomUUID()` there, which is server-side and secure-context-safe. That leaves `randomId`
  in `$lib/random.ts` for its other callers, or removes it if this was its last use.

For the guest cookie, the regex also has to accept the legacy 32-hex form, or existing guests would lose their vote
for the day. Accept both forms there (the helper can take a `{ compact: true }` flag or the cookie check can use a
second regex). After 400 days (the cookie max-age) the compact form can go, but that isn't worth tracking. Postgres
normalises both forms to the hyphenated one.

**4. Game server types.** `apps/game-server/src/db.ts` keeps `string` for these columns (as `pg` returns them). Its
comments say "text", so update them, and set `REQUIRED_MIGRATION = '0006_uuid_ids'`.

## Risks / Trade-offs

- **[A game server from before the migration runs while the migration commits]** → It holds remapped human ids in
  memory (seated players, rating updates) and would write the old ids. Those fail the `uuid` cast, so the game's
  writes fail and the game gets aborted. Mitigation: deploy when no rated human games are running (bot-only games are
  unaffected, since bot ids don't change). The new game server requires `0006`, and compose starts it only after web
  is healthy. Note this in the deploy step.
- **[The `alter type` locks tables]** → `ACCESS EXCLUSIVE` while the tables are rewritten. That takes seconds at
  today's size. Mitigation: none needed now. This is why we do it now rather than later.
- **[Better Auth ever sends a non-UUID id]** → The cast fails loudly at insert. That is the behaviour we want, and
  the sign-up test in the task list catches it.
- **[A missed reference column]** → The FK recreation fails on a type mismatch and the transaction rolls back. Also,
  a test asserts the `information_schema` column types listed in the spec.

## Migration Plan

1. Back up production Postgres (Dokploy database backup) before deploying.
2. Deploy while no rated human games are running. Web starts and runs `0006`. The game server waits for web to be
   healthy and checks `REQUIRED_MIGRATION`.
3. Smoke test: sign in with an existing account (session survives), check rating and history, sign up a new account,
   play a bot game, vote in the daily discard as a guest.
4. Rollback: run `down` (types back to `text`) and redeploy the previous images. Remapped human ids stay as UUID
   strings in `text` columns, which the old code handles. Restoring the backup is the full rollback.

## Open Questions

- None blocking. If production turns out to have many human users with active games at deploy time, schedule a
  maintenance window instead of relying on a quiet moment.
