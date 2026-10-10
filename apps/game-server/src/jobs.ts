// Scheduled jobs (node-cron, UTC). One game server instance runs them, and every job is safe to run twice or late:
// node-cron neither catches up runs missed while the server was down nor coordinates instances. Add jobs to `JOBS`.
import cron, { type ScheduledTask } from 'node-cron';
import type { Kysely } from 'kysely';
import type { BotPool } from './bots.ts';
import { botVotes, ensureHands } from './daily-discard.ts';
import type { DB } from './db.ts';

export interface JobDeps {
  db: Kysely<DB>;
  bots: BotPool;
}

interface Job {
  name: string;
  /** Cron expression, UTC. */
  cron: string;
  /** Also run once at startup (catch-up for jobs that keep something ready). */
  atStart?: boolean;
  run: (deps: JobDeps) => Promise<unknown>;
}

export const JOBS: Job[] = [
  // Hourly rather than daily: a missed run (server down at midnight) is made up within the hour.
  { name: 'daily-discard-hands', cron: '7 * * * *', atStart: true, run: ({ db }) => ensureHands(db) },
  {
    name: 'daily-discard-bot-votes',
    cron: '* * * * *',
    run: ({ db, bots }) => botVotes(db, bots.onlineIds(), bots.activeCount(), Math.random),
  },
];

async function runJob(job: Job, deps: JobDeps): Promise<void> {
  try {
    await job.run(deps);
  } catch (e) {
    console.error(`[jobs] ${job.name} failed`, e);
  }
}

/** Schedules every job; returns a stop function. */
export async function startJobs(deps: JobDeps): Promise<() => Promise<void>> {
  for (const job of JOBS) if (job.atStart) await runJob(job, deps);
  const tasks: ScheduledTask[] = JOBS.map((job) =>
    cron.schedule(job.cron, () => runJob(job, deps), { name: job.name, timezone: 'UTC', noOverlap: true }),
  );
  return async () => {
    for (const t of tasks) await t.stop();
  };
}
