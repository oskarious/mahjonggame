// Bulk Tenhou replay: replays every mjlog XML file in a directory through the engine (TENHOU rules) and reports the
// hands that differ from Tenhou. Opt-in, not part of `npm test`; the committed fixtures run in test/tenhou.test.ts.
//
//   npm run tenhou-replay --workspace @mahjong/engine -- <dir> [--verbose] [--limit N]
//
// Logs: https://tenhou.net/0/log/?<log id> (ids from the archives at https://tenhou.net/sc/raw/). Four-player only.
// Files are replayed on worker threads; the report is in file order whatever the thread count.
import { readFileSync, readdirSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { parseMjlog } from '../test/tenhou/mjlog.ts';
import { replayGame } from '../test/tenhou/replay.ts';

interface Job {
  dir: string;
  files: string[];
  verbose: boolean;
}

/** One file's replay: its report lines, hand count, hands with differences and mismatch messages. */
interface FileResult {
  file: string;
  skipped: boolean;
  hands: number;
  bad: number;
  lines: string[];
  mismatches: string[];
}

function replayFile(dir: string, file: string, verbose: boolean): FileResult {
  const out: FileResult = { file, skipped: false, hands: 0, bad: 0, lines: [], mismatches: [] };
  const game = parseMjlog(readFileSync(join(dir, file), 'utf8'));
  if (!game.fourPlayers) {
    out.skipped = true;
    return out;
  }
  let replays;
  try {
    replays = replayGame(game);
  } catch (e) {
    out.lines.push(`${file}: ${(e as Error).message}`);
    out.bad++;
    return out;
  }
  for (const r of replays) {
    out.hands++;
    if (!r.mismatches.length) continue;
    out.bad++;
    for (const m of r.mismatches) {
      out.mismatches.push(m);
      out.lines.push(`${file} ${r.label}: ${m}`);
    }
    if (verbose) out.lines.push(`  actions: ${JSON.stringify(r.actions)}`);
  }
  return out;
}

if (!isMainThread) {
  const job = workerData as Job;
  parentPort!.postMessage(job.files.map((f) => replayFile(job.dir, f, job.verbose)));
} else {
  const args = process.argv.slice(2);
  const dir = args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--limit');
  if (!dir) {
    console.error('usage: tenhou-replay <dir with mjlog .xml files> [--verbose] [--limit N]');
    process.exit(2);
  }
  const verbose = args.includes('--verbose');
  const limitAt = args.indexOf('--limit');
  const limit = limitAt >= 0 ? Number(args[limitAt + 1]) : Infinity;

  const files = readdirSync(dir)
    .filter((f) => /\.(xml|mjlog)$/.test(f))
    .sort()
    .slice(0, limit);
  const threads = Math.max(1, Math.min(files.length, availableParallelism() - 1));
  // Interleaved slices: neighbouring files (similar dates and sizes) spread over the threads.
  const parts = await Promise.all(
    Array.from({ length: threads }, (_, w) => {
      const job: Job = { dir, files: files.filter((_, i) => i % threads === w), verbose };
      return new Promise<FileResult[]>((resolve, reject) => {
        const worker = new Worker(fileURLToPath(import.meta.url), { workerData: job });
        worker.once('message', resolve);
        worker.once('error', reject);
      });
    }),
  );
  const results = parts.flat().sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : 0));

  let hands = 0;
  let bad = 0;
  let skipped = 0;
  // Groups mismatches by their wording without numbers, to see which kinds of difference dominate.
  const kinds = new Map<string, number>();
  for (const r of results) {
    for (const line of r.lines) console.log(line);
    hands += r.hands;
    bad += r.bad;
    if (r.skipped) skipped++;
    for (const m of r.mismatches) {
      const kind = m.replace(/-?\d+/g, '#').slice(0, 80);
      kinds.set(kind, (kinds.get(kind) ?? 0) + 1);
    }
  }
  console.log(`\n${files.length - skipped} games, ${hands} hands, ${bad} with differences (${skipped} files skipped)`);
  for (const [k, n] of [...kinds].sort((a, b) => b[1] - a[1])) console.log(`${String(n).padStart(6)}  ${k}`);
  process.exitCode = bad ? 1 : 0;
}
