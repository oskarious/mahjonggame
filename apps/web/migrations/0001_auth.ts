// Better Auth core tables + username plugin columns (emailAndPassword + username plugin, Better Auth 1.7).
// After a Better Auth upgrade, check its expected schema (it logs a "schema mismatch" on startup) and add a migration.
// Migrations import only from 'kysely' so scripts/migrate.ts can load them with plain Node.
import { sql, type Kysely } from 'kysely';

const now = sql`CURRENT_TIMESTAMP`;

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('user')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('name', 'text', (c) => c.notNull())
    .addColumn('email', 'text', (c) => c.notNull().unique())
    .addColumn('emailVerified', 'boolean', (c) => c.notNull())
    .addColumn('image', 'text')
    .addColumn('createdAt', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updatedAt', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('username', 'text', (c) => c.unique())
    .addColumn('displayUsername', 'text')
    .execute();

  await db.schema
    .createTable('session')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('expiresAt', 'timestamptz', (c) => c.notNull())
    .addColumn('token', 'text', (c) => c.notNull().unique())
    .addColumn('createdAt', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updatedAt', 'timestamptz', (c) => c.notNull())
    .addColumn('ipAddress', 'text')
    .addColumn('userAgent', 'text')
    .addColumn('userId', 'text', (c) => c.notNull().references('user.id').onDelete('cascade'))
    .execute();

  await db.schema
    .createTable('account')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('accountId', 'text', (c) => c.notNull())
    .addColumn('providerId', 'text', (c) => c.notNull())
    .addColumn('userId', 'text', (c) => c.notNull().references('user.id').onDelete('cascade'))
    .addColumn('accessToken', 'text')
    .addColumn('refreshToken', 'text')
    .addColumn('idToken', 'text')
    .addColumn('accessTokenExpiresAt', 'timestamptz')
    .addColumn('refreshTokenExpiresAt', 'timestamptz')
    .addColumn('scope', 'text')
    .addColumn('password', 'text')
    .addColumn('createdAt', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updatedAt', 'timestamptz', (c) => c.notNull())
    .execute();

  await db.schema
    .createTable('verification')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('identifier', 'text', (c) => c.notNull())
    .addColumn('value', 'text', (c) => c.notNull())
    .addColumn('expiresAt', 'timestamptz', (c) => c.notNull())
    .addColumn('createdAt', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('updatedAt', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .execute();

  await db.schema.createIndex('session_userId_idx').on('session').column('userId').execute();
  await db.schema.createIndex('account_userId_idx').on('account').column('userId').execute();
  await db.schema.createIndex('verification_identifier_idx').on('verification').column('identifier').execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  for (const t of ['verification', 'account', 'session', 'user']) await db.schema.dropTable(t).execute();
}
