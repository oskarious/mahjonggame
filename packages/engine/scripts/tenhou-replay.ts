// Bulk Tenhou replay: replays every mjlog XML file in a directory through the engine (TENHOU rules) and reports the
// hands that differ from Tenhou. Opt-in, not part of `npm test`; the committed fixtures run in test/tenhou.test.ts.
//
//   npm run tenhou-replay --workspace @mahjong/engine -- <dir> [--verbose] [--limit N]
//
// Logs: https://tenhou.net/0/log/?<log id> (ids from the archives at https://tenhou.net/sc/raw/). Four-player only.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseMjlog } from '../test/tenhou/mjlog.ts';
import { replayGame } from '../test/tenhou/replay.ts';

const args = process.argv.slice(2);
const dir = args.find((a) => !a.startsWith('--'));
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
let hands = 0;
let bad = 0;
let skipped = 0;
// Groups mismatches by their wording without numbers, to see which kinds of difference dominate.
const kinds = new Map<string, number>();
for (const f of files) {
  const game = parseMjlog(readFileSync(join(dir, f), 'utf8'));
  if (!game.fourPlayers) {
    skipped++;
    continue;
  }
  let replays;
  try {
    replays = replayGame(game);
  } catch (e) {
    console.log(`${f}: ${(e as Error).message}`);
    bad++;
    continue;
  }
  for (const r of replays) {
    hands++;
    if (!r.mismatches.length) continue;
    bad++;
    for (const m of r.mismatches) {
      const kind = m.replace(/-?\d+/g, '#').slice(0, 80);
      kinds.set(kind, (kinds.get(kind) ?? 0) + 1);
      console.log(`${f} ${r.label}: ${m}`);
    }
    if (verbose) console.log(`  actions: ${JSON.stringify(r.actions)}`);
  }
}
console.log(`\n${files.length - skipped} games, ${hands} hands, ${bad} with differences (${skipped} files skipped)`);
for (const [k, n] of [...kinds].sort((a, b) => b[1] - a[1])) console.log(`${String(n).padStart(6)}  ${k}`);
process.exitCode = bad ? 1 : 0;
