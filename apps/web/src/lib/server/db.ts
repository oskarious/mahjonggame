import { Kysely, PostgresDialect } from 'kysely';
import pg from 'pg';
import { env } from '$env/dynamic/private';
import type { DB } from './schema';

// One pool per server process. Connections are opened lazily, so importing this during the build is harmless.
const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 10 });

/** Typed query builder for app code. Better Auth uses the same instance. */
export const db = new Kysely<DB>({ dialect: new PostgresDialect({ pool }) });
