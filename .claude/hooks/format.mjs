// PostToolUse hook: formats (Prettier) and lints (ESLint --fix) each file Claude edits. Lint errors that --fix can't
// solve go back to Claude (exit 2) so it fixes them before moving on.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const file = JSON.parse(readFileSync(0, 'utf8')).tool_input?.file_path;
if (!file || !existsSync(file) || relative(root, file).startsWith('..')) process.exit(0);

const run = (bin, args) =>
  execFileSync(process.execPath, [join(root, bin), ...args, file], { cwd: root, stdio: 'pipe' });
try {
  run('node_modules/prettier/bin/prettier.cjs', ['--write', '--ignore-unknown', '--log-level', 'warn']);
  if (/\.(m?js|ts|svelte)$/.test(file)) run('node_modules/eslint/bin/eslint.js', ['--fix', '--no-warn-ignored']);
} catch (e) {
  process.stderr.write(`${e.stdout ?? ''}${e.stderr ?? ''}` || String(e));
  process.exit(2);
}
