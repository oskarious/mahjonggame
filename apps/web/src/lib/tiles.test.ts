import { describe, expect, it } from 'vitest';
import { TILESETS, type TilesetId } from './tiles.ts';

describe('tile artwork', () => {
  for (const id of Object.keys(TILESETS) as TilesetId[]) {
    it(`${id}: every kind, plain and red, has a bundled file`, () => {
      const urls = new Set<string>();
      for (let k = 0; k < 34; k++) {
        for (const red of [false, true]) {
          const url = TILESETS[id].image(k, red);
          expect(url, `kind ${k}${red ? ' red' : ''}`).toEqual(expect.any(String));
          urls.add(url);
        }
      }
      // 34 kinds plus the three red fives, all distinct.
      expect(urls.size).toBe(37);
    });
  }
});
