import type { Handle, ServerInit } from '@sveltejs/kit';
import type { Migration } from 'kysely/migration';
import { building } from '$app/environment';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { db } from '$lib/server/db';
import { migrateToLatest, migrationName } from '$lib/server/migrate';

type Auth = typeof import('$lib/server/auth').auth;

// Bundled into the build, so the runtime image needs no migration files on disk.
const files = import.meta.glob<Migration>('/migrations/*.ts', { eager: true });

let auth: Auth;

export const init: ServerInit = async () => {
  if (building) return;
  // Fail fast on a bad DATABASE_URL or migration rather than serving a half-working site.
  await migrateToLatest(db, Object.fromEntries(Object.entries(files).map(([path, m]) => [migrationName(path), m])));
  // Imported only after migrating: Better Auth checks the schema when it is created and caches a mismatch.
  auth = (await import('$lib/server/auth')).auth;
};

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.user = null;
  event.locals.session = null;
  if (building) return resolve(event);

  const path = event.url.pathname;
  // Health checks and the auth API itself don't need a session lookup.
  if (path !== '/healthz' && !path.startsWith('/api/auth/')) {
    const s = await auth.api.getSession({ headers: event.request.headers });
    event.locals.user = s?.user ?? null;
    event.locals.session = s?.session ?? null;
  }
  return svelteKitHandler({ event, resolve, auth, building });
};
