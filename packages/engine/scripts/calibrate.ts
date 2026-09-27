/**
 * Measures how strong each bot skill level plays by running bot-vs-bot games and fitting Elo
 * ratings to the placements (Bradley-Terry on every pair of players in every game).
 *
 *   node scripts/calibrate.ts [--games 4000] [--write]
 *
 * With --write the result is saved to src/bot-ratings.ts, which the engine uses to map an Elo
 * to a bot skill level.
 */
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { availableParallelism } from 'node:os';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_RULES,
  type GameState,
  applyAction,
  botAction,
  botProfile,
  createGame,
  pendingSeats,
  randomInt,
  seedRng,
  shuffle,
} from '../src/index.ts';

/** Skill levels to measure. */
const SKILLS = [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1];
/** This skill is pinned to ANCHOR_ELO; the others are relative to it. */
const ANCHOR_SKILL = 0.45;
const ANCHOR_ELO = 1500;

interface Job {
  from: number;
  to: number;
  seed: string;
}
/** Per game: skill index and final rank (1-4) of each seat. */
type GameResult = { skills: number[]; ranks: number[] };

function playGame(i: number, seed: string): GameResult {
  const rng = seedRng(`${seed}-${i}`);
  const random = () => randomInt(rng, 1_000_000) / 1_000_000;
  const skills = shuffle(rng, SKILLS.map((_, j) => j)).slice(0, 4);
  const profiles = skills.map((j) => botProfile(SKILLS[j]));
  let g: GameState = createGame(DEFAULT_RULES, `${seed}-game-${i}`).state;
  for (let steps = 0; steps < 50_000 && g.phase !== 'gameOver'; steps++) {
    if (g.phase === 'handOver') {
      g = applyAction(g, { type: 'nextHand' }).state;
      continue;
    }
    for (const s of pendingSeats(g)) {
      const a = botAction(g, s, { profile: profiles[s], random });
      if (!a) continue;
      g = applyAction(g, a).state;
      if (g.phase !== 'playing') break;
    }
  }
  if (!g.final) throw new Error(`Game ${i} did not finish`);
  const ranks = [0, 0, 0, 0];
  for (const f of g.final) ranks[f.seat] = f.rank;
  return { skills, ranks };
}

/** Bradley-Terry strengths from pairwise results (MM algorithm), as Elo. */
function fitElo(results: GameResult[]): { elo: number[]; games: number[] } {
  const n = SKILLS.length;
  const wins = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const games = new Array<number>(n).fill(0);
  for (const r of results) {
    for (let a = 0; a < 4; a++) {
      games[r.skills[a]]++;
      for (let b = a + 1; b < 4; b++) {
        const i = r.skills[a];
        const j = r.skills[b];
        if (r.ranks[a] < r.ranks[b]) wins[i][j]++;
        else if (r.ranks[a] > r.ranks[b]) wins[j][i]++;
        else {
          wins[i][j] += 0.5;
          wins[j][i] += 0.5;
        }
      }
    }
  }
  let p = new Array<number>(n).fill(1);
  for (let iter = 0; iter < 2000; iter++) {
    const next = p.map((pi, i) => {
      let w = 0;
      let den = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const nij = wins[i][j] + wins[j][i];
        w += wins[i][j];
        if (nij) den += nij / (pi + p[j]);
      }
      return den ? Math.max(w, 0.5) / den : pi;
    });
    const mean = Math.exp(next.reduce((a, x) => a + Math.log(x), 0) / n);
    p = next.map((x) => x / mean);
  }
  const anchor = p[SKILLS.indexOf(ANCHOR_SKILL)];
  return { elo: p.map((x) => ANCHOR_ELO + 400 * Math.log10(x / anchor)), games };
}

if (!isMainThread) {
  const job = workerData as Job;
  const out: GameResult[] = [];
  for (let i = job.from; i < job.to; i++) out.push(playGame(i, job.seed));
  parentPort!.postMessage(out);
} else {
  const args = process.argv.slice(2);
  const arg = (name: string) => {
    const i = args.indexOf(name);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const total = Number(arg('--games') ?? 4000);
  const seed = arg('--seed') ?? 'calibration';
  const workers = Math.max(1, availableParallelism() - 1);
  const started = Date.now();
  console.log(`Playing ${total} east-only games on ${workers} threads...`);

  const chunk = Math.ceil(total / workers);
  const parts = await Promise.all(
    Array.from({ length: workers }, (_, w) => {
      const job: Job = { from: w * chunk, to: Math.min(total, (w + 1) * chunk), seed };
      return new Promise<GameResult[]>((resolve, reject) => {
        const worker = new Worker(fileURLToPath(import.meta.url), { workerData: job });
        worker.once('message', resolve);
        worker.once('error', reject);
      });
    }),
  );
  const results = parts.flat();
  const { elo, games } = fitElo(results);
  const seconds = ((Date.now() - started) / 1000).toFixed(0);

  console.log(`\n${results.length} games in ${seconds}s\n`);
  console.log('skill   elo   games  avg rank');
  SKILLS.forEach((s, i) => {
    const ranks = results.flatMap((r) => r.skills.flatMap((k, seat) => (k === i ? [r.ranks[seat]] : [])));
    const avg = ranks.reduce((a, b) => a + b, 0) / ranks.length;
    console.log(`${s.toFixed(2).padStart(5)}  ${elo[i].toFixed(0).padStart(5)}  ${String(games[i]).padStart(5)}  ${avg.toFixed(3)}`);
  });

  if (args.includes('--write')) {
    const table = SKILLS.map((skill, i) => ({ skill, elo: Math.round(elo[i]) }));
    const file = fileURLToPath(new URL('../src/bot-ratings.ts', import.meta.url));
    writeFileSync(
      file,
      `// Generated by scripts/calibrate.ts from ${results.length} bot-vs-bot games (seed "${seed}").\n` +
        `// Skill ${ANCHOR_SKILL} is pinned to ${ANCHOR_ELO}. Regenerate after changing the bots; do not edit by hand.\n` +
        `export const BOT_RATINGS: { skill: number; elo: number }[] = [\n` +
        table.map((r) => `  { skill: ${r.skill}, elo: ${r.elo} },\n`).join('') +
        `];\n`,
    );
    console.log(`\nWrote ${file}`);
  }
}
