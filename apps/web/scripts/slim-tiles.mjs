// One-off: prepares the slim tileset for the web. Not part of the build; run by hand and commit the output.
//   node apps/web/scripts/slim-tiles.mjs <source dir with man/ pin/ sou/ hon/>
// Needs network once for `npx svgo@4` (svgo 4 keeps the viewBox by default).
import { execSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = process.argv[2];
if (!src) throw new Error('usage: node slim-tiles.mjs <source dir>');
const out = fileURLToPath(new URL('../src/lib/assets/tiles/slim', import.meta.url));
const DIRS = ['man', 'pin', 'sou', 'hon'];

const files = () => DIRS.flatMap((d) => readdirSync(join(out, d)).map((f) => join(out, d, f)));

for (const dir of DIRS) {
  mkdirSync(join(out, dir), { recursive: true });
  for (const file of readdirSync(join(src, dir)).filter((f) => f.endsWith('.svg'))) {
    let svg = readFileSync(join(src, dir, file), 'utf8');
    // Glyphs stay text in the device's fonts: Malgun Gothic where installed, else the system sans-serif.
    svg = svg.replaceAll(/font-family:[^;"]*/g, "font-family:'Malgun Gothic',sans-serif");
    // Japanese glyph forms when falling back.
    svg = svg.replace('<svg ', '<svg xml:lang="ja" ');
    // The white dragon is only a white body: leave the face to the client (Tile draws the haku frame).
    if (dir === 'hon' && file === 'wh.svg') svg = svg.replace('fill:white', 'fill:none');
    writeFileSync(join(out, dir, file), svg);
  }
}

execSync(`npx -y svgo@4 -rf "${out}" -p 2 --quiet`, { stdio: 'inherit' });

// The circles repeat one detailed path several times each (outline, clip, strokes): define it once, <use> it.
for (const f of files()) {
  let svg = readFileSync(f, 'utf8');
  const counts = new Map();
  for (const [, d] of svg.matchAll(/<path [^>]*?d="([^"]{300,})"/g)) counts.set(d, (counts.get(d) ?? 0) + 1);
  const shared = [...counts].filter(([, n]) => n > 1).map(([d]) => d);
  if (!shared.length) continue;
  shared.forEach((d, i) => {
    svg = svg.replaceAll(new RegExp(`<path ([^>]*?)d="${d.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'), `<use $1href="#s${i}"`);
  });
  const defs = `<defs>${shared.map((d, i) => `<path id="s${i}" d="${d}"/>`).join('')}</defs>`;
  svg = svg.replace(/(<svg[^>]*>)/, `$1${defs}`);
  writeFileSync(f, svg);
}
