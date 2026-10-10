// The engine version each online game was created under (ENGINE_VERSION in @mahjong/engine): the game server aborts
// running games of another version on recovery instead of finishing them under different rules. Existing rows were
// all created under version 2; the default is dropped so every new game must set it.
import type { Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('game')
    .addColumn('engineVersion', 'integer', (c) => c.notNull().defaultTo(2))
    .execute();
  await db.schema
    .alterTable('game')
    .alterColumn('engineVersion', (c) => c.dropDefault())
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.alterTable('game').dropColumn('engineVersion').execute();
}
