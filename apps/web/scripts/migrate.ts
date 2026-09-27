// Standalone migration runner for development: `npm run db:migrate --workspace @mahjong/web`.
// The server also migrates on startup (src/hooks.server.ts), so this is optional.
import { readdirSync } from 'node:fs';
import { Kysely, PostgresDialect } from 'kysely';
import type { Migration } from 'kysely/migration';
import pg from 'pg';
import { migrateToLatest, migrationName } from '../src/lib/server/migrate.ts';

const dir = new URL('../migrations/', import.meta.url);
const migrations: Record<string, Migration> = {};
for (const f of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
  migrations[migrationName(f)] = await import(new URL(f, dir).href);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = new Kysely<unknown>({ dialect: new PostgresDialect({ pool }) });
try {
  const results = await migrateToLatest(db, migrations);
  if (!results.length) console.log('up to date');
} finally {
  await db.destroy();
}
