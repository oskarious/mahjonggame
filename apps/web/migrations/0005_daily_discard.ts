// The home page's daily discard poll. `daily_discard`: each UTC day's hand, stored ahead by the game server (the web
// app stores it too if it finds none). `daily_discard_vote`: one vote per voter and day, the kind of tile discarded,
// by a user (signed-in player or bot player) or a guest (the id in their `riichi_voter` cookie): exactly one is set.
import { sql, type Kysely } from 'kysely';

const now = sql`CURRENT_TIMESTAMP`;

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('daily_discard')
    .addColumn('date', 'varchar(10)', (c) => c.primaryKey())
    .addColumn('exercise', 'jsonb', (c) => c.notNull())
    .addColumn('botShare', 'real', (c) => c.notNull())
    .addColumn('createdAt', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .execute();
  await db.schema
    .createTable('daily_discard_vote')
    .addColumn('id', 'bigserial', (c) => c.primaryKey())
    .addColumn('date', 'varchar(10)', (c) => c.notNull().references('daily_discard.date').onDelete('cascade'))
    .addColumn('userId', 'text', (c) => c.references('user.id').onDelete('cascade'))
    .addColumn('guestId', 'text')
    .addColumn('kind', 'smallint', (c) => c.notNull())
    .addColumn('createdAt', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addCheckConstraint('daily_discard_vote_one_voter', sql`("userId" is null) <> ("guestId" is null)`)
    // NULLs are distinct in unique constraints: one vote per user and per guest a day.
    .addUniqueConstraint('daily_discard_vote_user', ['date', 'userId'])
    .addUniqueConstraint('daily_discard_vote_guest', ['date', 'guestId'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  await db.schema.dropTable('daily_discard_vote').execute();
  await db.schema.dropTable('daily_discard').execute();
}
