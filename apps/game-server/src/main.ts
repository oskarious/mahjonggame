// Entry point: config → database check → load bot players → recover unfinished games → top up the bot pool → listen.
// SIGTERM stops matchmaking, tells clients to reconnect and exits; the next instance resumes the games from the database.
import { configFromEnv } from './config.ts';
import { checkMigration, createDb } from './db.ts';
import { Hub } from './hub.ts';
import { replayGame } from './recovery.ts';
import { createGameServer } from './server.ts';
import { PgStore } from './store.ts';

const config = configFromEnv();
const db = createDb(config.databaseUrl);
await checkMigration(db);

const hub = new Hub({ store: new PgStore(db, config.startRating), config });
await hub.bots.load();
const recovered = await hub.recover((g) => replayGame(g.rules, g.seed, g.actions));
if (recovered) console.log(`Resumed ${recovered} unfinished game(s)`);
const created = await hub.bots.ensurePool();
console.log(`Bot players: ${hub.bots.bots.size}${created ? ` (${created} new)` : ''}${config.botsBackground ? '' : ', background games off'}`);

const server = createGameServer(hub, config);
const tick = setInterval(() => hub.tick().catch((e) => console.error('[hub] tick failed', e)), 1000);
server.http.listen(config.port, () => console.log(`Game server on :${config.port} (auth via ${config.webInternalUrl})`));

let stopping = false;
async function stop(signal: string) {
  if (stopping) return;
  stopping = true;
  console.log(`${signal}: shutting down`);
  clearInterval(tick);
  hub.shutdown();
  await server.close();
  await db.destroy();
  process.exit(0);
}
process.on('SIGTERM', () => void stop('SIGTERM'));
process.on('SIGINT', () => void stop('SIGINT'));
