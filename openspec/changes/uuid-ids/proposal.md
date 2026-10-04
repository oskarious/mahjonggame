## Why

Every id column is `text`, but most of what we store is a UUID: game ids, game seeds and bot player ids all come from
`crypto.randomUUID()`. Human accounts are the exception: Better Auth gives `user`, `session`, `account` and
`verification` rows 32-character random strings (e.g. `ZW246msai5rttzq9XFZtd6xQvyADWtUf`), so today the `user.id` column
holds two formats. As text, a UUID takes 37 bytes and compares as a string. As native `uuid` it takes 16 bytes and
Postgres rejects malformed values. The biggest table, `game_action`, repeats `gameId` in every row and in its primary
key index. The tables are still small, so this is the cheapest time to change it.

## What Changes

- Better Auth is configured with `advanced.database.generateId: 'uuid'`, so new users, sessions, accounts and
  verification rows get UUIDs. On Postgres, Better Auth leaves the id to the database (`DEFAULT gen_random_uuid()`).
- A new migration `0006_uuid_ids` turns these columns into `uuid`: `user.id`, `session.id`, `account.id`,
  `verification.id`, `game.id`, and every column that references them (`session.userId`, `account.userId`,
  `rating.userId`, `game_seat.userId`, `game_seat.gameId`, `game_action.gameId`, `bot.userId`,
  `daily_discard_vote.userId`).
- **BREAKING (data)**: existing human user ids are not UUIDs, so the migration gives each one a new UUID and rewrites
  every reference to it in the same transaction. Bot user ids and game ids are already UUIDs and are cast unchanged.
  Sessions keep working because they are looked up by token, not by id.
- `daily_discard_vote.guestId` (the `riichi_voter` cookie, 32 hex characters) also becomes `uuid`. Postgres accepts
  the hyphen-less form, so existing cookies and votes still match. A cookie that does not parse as a UUID counts as no
  guest id.
- Ids that come from outside before reaching a `uuid` column are validated first, so a malformed id is a 404 or "no
  such thing" instead of a Postgres cast error (500). This covers the admin API's `/internal/bots/:id` and the guest
  cookie.
- Unchanged: `game.seed` stays `text`. It is engine input that happens to be generated as a UUID, not an identifier.
  `daily_discard.date`, `setting.key` and `daily_discard_vote.id` (bigserial) stay as they are. TypeScript types stay
  `string`, because the `pg` driver returns `uuid` as a string.

## Capabilities

### New Capabilities

- `database-ids`: how records are identified in the database: which ids are UUIDs, who generates them, and how
  externally supplied ids are validated before they reach the database.

### Modified Capabilities

(none, `openspec/specs/` has no specs yet)

## Impact

- `apps/web/migrations/0006_uuid_ids.ts` (new), `apps/web/src/lib/server/auth.ts` (generateId),
  `apps/web/src/lib/server/schema.ts` (comments only), `apps/web/src/lib/server/daily-discard.ts` (guest cookie
  validation), `apps/web/src/lib/random.ts` (only if guest ids switch to generated UUIDs).
- `apps/game-server/src/db.ts` (kept in sync with the schema, per AGENTS.md), `apps/game-server/src/admin.ts` or
  `bots.ts` (validate the bot id).
- `packages/protocol`: a shared `isUuid` helper. The WebSocket `gameId` guard can tighten from "1–64 chars" to UUID.
- Deploy: the migration runs when the web app starts. The game server should restart after the migration, because it
  holds user ids from before the rewrite in memory (running games, the bot pool). It checks that migrations are
  applied before it starts.
- No change to the engine, offline saves (`SAVE_VERSION`), or the fairness rules.
