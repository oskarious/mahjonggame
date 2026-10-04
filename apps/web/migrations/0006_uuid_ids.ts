// Ids become native `uuid` columns (see openspec uuid-ids). Game and bot ids were already UUIDs stored as text; human
// accounts had Better Auth's 32-character ids, so each gets a new random UUID and every reference is rewritten.
// Better Auth now uses `generateId: 'uuid'` and leaves the id to the `gen_random_uuid()` defaults added here.
// Runs in the migrator's transaction: any failure leaves the old schema and ids.
import { sql, type Kysely } from 'kysely';

/** Foreign keys on the converted columns: [table, column, referenced table, on delete]. Names are Postgres' defaults. */
const FKS = [
  ['session', 'userId', 'user', 'cascade'],
  ['account', 'userId', 'user', 'cascade'],
  ['rating', 'userId', 'user', 'cascade'],
  ['game_seat', 'userId', 'user', 'set null'],
  ['bot', 'userId', 'user', 'cascade'],
  ['daily_discard_vote', 'userId', 'user', 'cascade'],
  ['game_seat', 'gameId', 'game', 'cascade'],
  ['game_action', 'gameId', 'game', 'cascade'],
] as const;

/** Every converted column: the ids, then the columns that reference them, then the guest cookie id. */
const COLUMNS = [
  ['user', 'id'],
  ['session', 'id'],
  ['account', 'id'],
  ['verification', 'id'],
  ['game', 'id'],
  ...FKS.map(([table, column]) => [table, column] as const),
  ['daily_discard_vote', 'guestId'],
] as const;

/** Tables whose ids Better Auth no longer sends on insert. */
const AUTH_TABLES = ['user', 'session', 'account', 'verification'] as const;

const UUID_RE = '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

const fkName = (table: string, column: string) => `${table}_${column}_fkey`;

async function dropForeignKeys(db: Kysely<any>) {
  for (const [table, column] of FKS) {
    await sql`alter table ${sql.table(table)} drop constraint ${sql.id(fkName(table, column))}`.execute(db);
  }
}

async function addForeignKeys(db: Kysely<any>) {
  for (const [table, column, ref, onDelete] of FKS) {
    await sql`alter table ${sql.table(table)} add constraint ${sql.id(fkName(table, column))}
      foreign key (${sql.ref(column)}) references ${sql.table(ref)} (id) on delete ${sql.raw(onDelete)}`.execute(db);
  }
}

export async function up(db: Kysely<any>): Promise<void> {
  await dropForeignKeys(db);

  // Human accounts: a new UUID per non-UUID id, rewritten everywhere it is referenced.
  await sql`create temp table user_id_map on commit drop as
    select id as old, gen_random_uuid()::text as new from "user" where id !~* ${UUID_RE}`.execute(db);
  for (const [table, column, ref] of FKS) {
    if (ref !== 'user') continue;
    await sql`update ${sql.table(table)} t set ${sql.ref(column)} = m.new
      from user_id_map m where t.${sql.ref(column)} = m.old`.execute(db);
  }
  await sql`update "user" u set id = m.new from user_id_map m where u.id = m.old`.execute(db);
  // A credential account's accountId is its user id; Better Auth finds the password by both.
  await sql`update account a set "accountId" = m.new from user_id_map m
    where a."providerId" = 'credential' and a."accountId" = m.old`.execute(db);

  // Nothing references these; a session is found by its token, so nobody is signed out.
  for (const table of ['session', 'account', 'verification']) {
    await sql`update ${sql.table(table)} set id = gen_random_uuid()::text where id !~* ${UUID_RE}`.execute(db);
  }

  // Postgres also accepts the 32-hex form of the guest cookie ids (`randomId()`).
  for (const [table, column] of COLUMNS) {
    await sql`alter table ${sql.table(table)} alter column ${sql.ref(column)} type uuid
      using ${sql.ref(column)}::uuid`.execute(db);
  }
  for (const table of AUTH_TABLES) {
    await sql`alter table ${sql.table(table)} alter column id set default gen_random_uuid()`.execute(db);
  }

  await addForeignKeys(db);
}

/** Back to text columns. The old human ids are not restored: nothing outside the database refers to them. */
export async function down(db: Kysely<any>): Promise<void> {
  await dropForeignKeys(db);
  for (const table of AUTH_TABLES) {
    await sql`alter table ${sql.table(table)} alter column id drop default`.execute(db);
  }
  for (const [table, column] of COLUMNS) {
    await sql`alter table ${sql.table(table)} alter column ${sql.ref(column)} type text
      using ${sql.ref(column)}::text`.execute(db);
  }
  await addForeignKeys(db);
}
