// Starts the web dev server and the game server together (root `npm run dev`), prefixing their output.
// Plain Node so there is no extra dependency; Ctrl-C stops both.
import { spawn } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const procs = [
  ['web', ['run', 'dev', '--workspace', '@mahjong/web']],
  ['game', ['run', 'dev', '--workspace', '@mahjong/game-server']],
].map(([name, args]) => {
  const p = spawn(npm, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });
  const pipe = (stream, out) => {
    let rest = '';
    stream.on('data', (chunk) => {
      const lines = (rest + chunk).split('\n');
      rest = lines.pop();
      for (const l of lines) out.write(`[${name}] ${l}\n`);
    });
  };
  pipe(p.stdout, process.stdout);
  pipe(p.stderr, process.stderr);
  p.on('exit', (code) => {
    process.stdout.write(`[${name}] exited with ${code}\n`);
    stop();
  });
  return p;
});

let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  for (const p of procs) if (p.exitCode === null) p.kill();
  setTimeout(() => process.exit(0), 300);
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
