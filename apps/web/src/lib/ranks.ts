// Rank icons are one shape per sub-rank, shared by all ranks and tinted with the rank's colours at runtime: drop square
// SVGs into ./assets/ranks/ as `1.svg` … `5.svg` (the art shows the sub-rank), no code change. Draw them in any
// colours: the fills are sorted by lightness and swapped for the badge's --rank-light/--rank-mid/--rank-dark.
const files = import.meta.glob<string>('./assets/ranks/*.svg', { eager: true, query: '?raw', import: 'default' });

const FILL = /(fill(?:="|:\s*))(#(?:[0-9a-f]{6}|[0-9a-f]{3})\b|rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\))/gi;
const ROLES = ['dark', 'mid', 'light'] as const;

/** "#2c2c2c", "#ccc" or "rgb(44,44,44)" → [r, g, b]. */
function channels(colour: string): number[] {
  if (colour.startsWith('rgb')) return colour.match(/\d+/g)!.map(Number);
  let h = colour.slice(1);
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

const key = (colour: string) => channels(colour).join(',');
const lightness = (rgb: string) => {
  const [r, g, b] = rgb.split(',').map(Number);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Swaps an SVG's fill colours for the rank colour variables: darkest → dark, lightest → light, a single fill → mid. */
export function tintable(svg: string): string {
  const fills = [...new Set([...svg.matchAll(FILL)].map((m) => key(m[2])))].sort((a, b) => lightness(a) - lightness(b));
  const role = (colour: string) => {
    if (fills.length === 1) return 'mid';
    return ROLES[Math.round((fills.indexOf(key(colour)) * 2) / (fills.length - 1))];
  };
  return svg.replace(FILL, (_, prefix: string, colour: string) => `${prefix}var(--rank-${role(colour)})`);
}

/** Tintable SVG markup by file name without extension ("3" for sub-rank 3). */
export const RANK_ICONS: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, svg]) => [path.slice(path.lastIndexOf('/') + 1, -'.svg'.length), tintable(svg)]),
);
