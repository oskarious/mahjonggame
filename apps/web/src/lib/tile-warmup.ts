import type { Tileset, TilesetId } from '$lib/tiles';

// Every image of a tileset, fetched and decoded before a game needs it. The elements stay referenced for the life of
// the page so the browser keeps the decoded bitmaps; a tileset is warmed once.
const warmed = new Map<TilesetId, HTMLImageElement[]>();

export function warmTiles(set: Tileset, makeImage: () => HTMLImageElement = () => new Image()): void {
  if (warmed.has(set.id)) return;
  const urls = new Set<string>();
  for (let k = 0; k < 34; k++) {
    urls.add(set.image(k, false));
    urls.add(set.image(k, true));
  }
  const images: HTMLImageElement[] = [];
  for (const url of urls) {
    try {
      const img = makeImage();
      img.decoding = 'async';
      img.src = url;
      void img.decode().catch(() => {});
      images.push(img);
    } catch {
      /* a failing image only loses its head start */
    }
  }
  warmed.set(set.id, images);
}

/** Runs `fn` when the page is idle (Safari has no requestIdleCallback). */
export function idle(fn: () => void): () => void {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(fn, { timeout: 2000 });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(fn, 200);
  return () => clearTimeout(id);
}
