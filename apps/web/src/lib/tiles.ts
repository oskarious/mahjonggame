import { type Kind, type RedFives, type Tile, isRedTile, kindOf } from '@mahjong/engine';

const SUITS = ['Man', 'Pin', 'Sou'];
const HONORS = ['Ton', 'Nan', 'Shaa', 'Pei', 'Haku', 'Hatsu', 'Chun'];
const HONOR_NAMES = ['East', 'South', 'West', 'North', 'White', 'Green', 'Red'];
const SUIT_NAMES = ['characters', 'circles', 'bamboo'];

export interface Tileset {
  id: TilesetId;
  /** Height / width of an upright tile. */
  ratio: number;
  /** Margin around the artwork inside the tile face, in % of its height and width. */
  margin: { y: number; x: number };
  image(k: Kind, red: boolean): string;
}
export type TilesetId = 'classic' | 'slim';

const SLIM_SUITS = ['man', 'pin', 'sou'];
const SLIM_HONORS = ['e', 's', 'w', 'n', 'wh', 'g', 'r'];

export const TILESETS: Record<TilesetId, Tileset> = {
  // FluffyStuff (CC0), 3:4, with a margin around the artwork.
  classic: {
    id: 'classic',
    ratio: 4 / 3,
    margin: { y: 7, x: 8 },
    image(k, red) {
      if (k >= 27) return `/tiles/${HONORS[k - 27]}.svg`;
      const n = (k % 9) + 1;
      return `/tiles/${SUITS[Math.floor(k / 9)]}${n}${red && n === 5 ? '-Dora' : ''}.svg`;
    },
  },
  // Drawn for this project, about 1:2, artwork edge to edge.
  slim: {
    id: 'slim',
    ratio: 119 / 60,
    margin: { y: 0, x: 0 },
    image(k, red) {
      if (k >= 27) return `/tiles/slim/hon/${SLIM_HONORS[k - 27]}.svg`;
      const n = (k % 9) + 1;
      return `/tiles/slim/${SLIM_SUITS[Math.floor(k / 9)]}/${n}${red && n === 5 ? 'r' : ''}.svg`;
    },
  },
};

export function kindImage(k: Kind, red = false, set: Tileset = TILESETS.classic): string {
  return set.image(k, red);
}

export function tileImage(t: Tile, red: RedFives, set: Tileset = TILESETS.classic): string {
  return kindImage(kindOf(t), isRedTile(t, red), set);
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
