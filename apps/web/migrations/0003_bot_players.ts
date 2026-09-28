// Bot players (accounts without a credential, see openspec bot-players), runtime settings and the admin role.
// Bot users are created by the game server; this migration only adds the tables and the role column.
import { sql, type Kysely } from 'kysely';

const now = sql`CURRENT_TIMESTAMP`;

export async function up(db: Kysely<any>): Promise<void> {
  // Declared in Better Auth's user.additionalFields (input: false); set by hand in the database.
  await db.schema
    .alterTable('user')
    .addColumn('role', 'text', (c) => c.notNull().defaultTo('user'))
    .execute();

  await db.schema
    .createTable('bot')
    .addColumn('userId', 'text', (c) => c.primaryKey().references('user.id').onDelete('cascade'))
    .addColumn('skill', 'real', (c) => c.notNull())
    // Retired bots keep their account and history but are never seated again.
    .addColumn('active', 'boolean', (c) => c.notNull().defaultTo(true))
    .addColumn('createdAt', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .execute();

  await db.schema
    .createTable('setting')
    .addColumn('key', 'text', (c) => c.primaryKey())
    .addColumn('value', 'jsonb', (c) => c.notNull())
    .addColumn('updatedAt', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('setting').execute();
  await db.schema.dropTable('bot').execute();
  await db.schema.alterTable('user').dropColumn('role').execute();
}
