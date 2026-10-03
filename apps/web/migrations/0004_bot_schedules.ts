// Bot schedules (see openspec bot-active-hours): each bot player's home time zone, free-time windows and appetite.
// Nullable: the game server generates and stores a schedule for every bot that has none when it loads the pool.
import type { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('bot').addColumn('schedule', 'jsonb').execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('bot').dropColumn('schedule').execute();
}
