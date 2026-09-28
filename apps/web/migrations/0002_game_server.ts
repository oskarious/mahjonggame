// Online play: ratings and game records (games, seats, action log). Written by the game server, read by both.
// The game server checks that this migration is applied before it starts (it does not run migrations itself).
import { sql, type Kysely } from 'kysely';

const now = sql`CURRENT_TIMESTAMP`;

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('rating')
    .addColumn('userId', 'text', (c) => c.primaryKey().references('user.id').onDelete('cascade'))
    .addColumn('rating', 'integer', (c) => c.notNull())
    .addColumn('games', 'integer', (c) => c.notNull().defaultTo(0))
    .addColumn('updatedAt', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .execute();

  await db.schema
    .createTable('game')
    .addColumn('id', 'text', (c) => c.primaryKey())
    .addColumn('format', 'text', (c) => c.notNull())
    .addColumn('rules', 'jsonb', (c) => c.notNull())
    .addColumn('seed', 'text', (c) => c.notNull())
    .addColumn('status', 'text', (c) => c.notNull())
    .addColumn('createdAt', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addColumn('endedAt', 'timestamptz')
    .addColumn('final', 'jsonb')
    .execute();

  await db.schema
    .createTable('game_seat')
    .addColumn('gameId', 'text', (c) => c.notNull().references('game.id').onDelete('cascade'))
    .addColumn('seat', 'smallint', (c) => c.notNull())
    // Null for bots and for deleted accounts (records outlive the account, see specs/game-records).
    .addColumn('userId', 'text', (c) => c.references('user.id').onDelete('set null'))
    .addColumn('botSkill', 'real')
    .addColumn('ratingBefore', 'integer')
    .addColumn('ratingAfter', 'integer')
    .addColumn('placement', 'smallint')
    .addColumn('points', 'integer')
    .addPrimaryKeyConstraint('game_seat_pk', ['gameId', 'seat'])
    .execute();

  await db.schema
    .createTable('game_action')
    .addColumn('gameId', 'text', (c) => c.notNull().references('game.id').onDelete('cascade'))
    .addColumn('seq', 'integer', (c) => c.notNull())
    .addColumn('action', 'jsonb', (c) => c.notNull())
    .addColumn('at', 'timestamptz', (c) => c.notNull().defaultTo(now))
    .addPrimaryKeyConstraint('game_action_pk', ['gameId', 'seq'])
    .execute();

  await db.schema.createIndex('game_status_idx').on('game').column('status').execute();
  await db.schema.createIndex('game_seat_userId_idx').on('game_seat').column('userId').execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  for (const t of ['game_action', 'game_seat', 'game', 'rating']) await db.schema.dropTable(t).execute();
}
