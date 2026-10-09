// Learn progress and trainer stats, kept only on accounts (see openspec account-only-progress): one row per user,
// the course (`learn`, Progress v2) and the trainers (`train`, TrainData v1) as documents. Rows are created on the
// first change.
import { sql, type Kysely } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('user_progress')
    .addColumn('userId', 'uuid', (c) => c.primaryKey().references('user.id').onDelete('cascade'))
    .addColumn('learn', 'jsonb', (c) => c.notNull())
    .addColumn('train', 'jsonb', (c) => c.notNull())
    .addColumn('updatedAt', 'timestamptz', (c) => c.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('user_progress').execute();
}
