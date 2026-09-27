import type { Kysely } from 'kysely';
import { Migrator, type Migration } from 'kysely/migration';

/**
 * Runs pending migrations (Kysely's Migrator: `kysely_migration` table, advisory lock; on Postgres the pending batch runs in one transaction).
 * `migrations` maps a sortable name (e.g. `0001_auth`) to a module with `up`/`down`.
 * Kept free of SvelteKit/Vite imports so `scripts/migrate.ts` can run it with plain Node.
 */
export async function migrateToLatest(db: Kysely<any>, migrations: Record<string, Migration>, log = console.log) {
  const migrator = new Migrator({ db, provider: { getMigrations: async () => migrations } });
  const { error, results } = await migrator.migrateToLatest();
  for (const r of results ?? []) log(`migration ${r.migrationName}: ${r.status}`);
  if (error) throw new Error('migration failed', { cause: error });
  return results ?? [];
}

/** `/x/migrations/0001_auth.ts` → `0001_auth`. */
export function migrationName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1).replace(/\.ts$/, '');
}
