import { type Kind, type RedFives, type Tile, isRedTile, kindOf } from '@mahjong/engine';

const SUITS = ['Man', 'Pin', 'Sou'];
const HONORS = ['Ton', 'Nan', 'Shaa', 'Pei', 'Haku', 'Hatsu', 'Chun'];
const HONOR_NAMES = ['East', 'South', 'West', 'North', 'White', 'Green', 'Red'];
const SUIT_NAMES = ['characters', 'circles', 'bamboo'];

export function kindImage(k: Kind, red = false): string {
  if (k >= 27) return `/tiles/${HONORS[k - 27]}.svg`;
  const n = (k % 9) + 1;
  return `/tiles/${SUITS[Math.floor(k / 9)]}${n}${red && n === 5 ? '-Dora' : ''}.svg`;
}

export function tileImage(t: Tile, red: RedFives): string {
  return kindImage(kindOf(t), isRedTile(t, red));
}

export function kindName(k: Kind): string {
  return k >= 27 ? HONOR_NAMES[k - 27] : `${(k % 9) + 1} ${SUIT_NAMES[Math.floor(k / 9)]}`;
}

const HONOR_INDEX = ['E', 'S', 'W', 'N', 'Wh', 'G', 'R'];
const SUIT_CLASS = ['man', 'pin', 'sou'];

/** Short Latin index printed in the tile corner: 1-9, E/S/W/N, Wh/G/R. */
export function kindIndex(k: Kind): { text: string; suit: string } {
  if (k >= 27) return { text: HONOR_INDEX[k - 27], suit: 'honor' };
  return { text: String((k % 9) + 1), suit: SUIT_CLASS[Math.floor(k / 9)] };
}

/** Sort key for displaying a hand: by kind, red five after normal fives. */
export function sortTiles(tiles: Tile[]): Tile[] {
  return [...tiles].sort((a, b) => kindOf(a) - kindOf(b) || b - a);
}
