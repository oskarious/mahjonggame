import { isRedTile, kindOf } from '@mahjong/engine';
import { kindName } from '../tiles';
import { RED, tilesOf } from '@mahjong/drills/position';

export type Segment = { text: string } | { tiles: string };

/** Splits "Discard {5p} to wait on {14m}." into text and tile-notation segments. */
export function segments(s: string): Segment[] {
  const out: Segment[] = [];
  const re = /\{([0-9mpsz ]+)\}/g;
  let last = 0;
  for (let m = re.exec(s); m; m = re.exec(s)) {
    if (m.index > last) out.push({ text: s.slice(last, m.index) });
    out.push({ tiles: m[1] });
    last = re.lastIndex;
  }
  if (last < s.length) out.push({ text: s.slice(last) });
  return out;
}

/** Plain text with tiles in words, for meta descriptions, JSON-LD and text alternatives. */
export function plain(s: string): string {
  return segments(s)
    .map((x) => ('text' in x ? x.text : describe(x.tiles)))
    .join('');
}

/** Tiles in words for a notation string: "1 characters, 2 characters and 3 characters". */
export function describe(notation: string): string {
  const names = tilesOf(notation).map((t) => (isRedTile(t, RED) ? 'red ' : '') + kindName(kindOf(t)));
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** Number of sentences in a prompt (for the content test). */
export const sentences = (s: string) =>
  plain(s)
    .split(/[.!?](\s|$)/)
    .filter((x) => x.trim().length > 1).length;
