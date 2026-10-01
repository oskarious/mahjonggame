import { describe, expect, it } from 'vitest';
import { TILESETS } from './tiles.ts';
import { warmTiles } from './tile-warmup.ts';

function fakeImages(fail = false) {
  const srcs: string[] = [];
  const make = () =>
    ({
      decoding: 'auto',
      set src(v: string) {
        srcs.push(v);
      },
      decode: () => (fail ? Promise.reject(new Error('broken')) : Promise.resolve()),
    }) as unknown as HTMLImageElement;
  return { srcs, make };
}

describe('warmTiles', () => {
  it('requests every image of a tileset once, and only once per page', () => {
    const { srcs, make } = fakeImages();
    warmTiles(TILESETS.slim, make);
    expect(srcs).toHaveLength(37);
    expect(new Set(srcs).size).toBe(37);
    warmTiles(TILESETS.slim, make);
    expect(srcs).toHaveLength(37);
  });

  it('a failing decode throws nothing', async () => {
    const { srcs, make } = fakeImages(true);
    expect(() => warmTiles(TILESETS.classic, make)).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
    expect(srcs).toHaveLength(37);
  });
});
