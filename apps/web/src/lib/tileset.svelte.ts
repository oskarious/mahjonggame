import { TILESETS, type Tileset, type TilesetId } from '$lib/tiles';

/** The tile artwork chosen on this device (a display choice only; never sent anywhere). */
const KEY = 'riichi:tileset';

function read(): TilesetId {
  try {
    const v = localStorage.getItem(KEY);
    return v !== null && Object.hasOwn(TILESETS, v) ? (v as TilesetId) : 'slim';
  } catch {
    return 'slim';
  }
}

const state = $state({ id: read() });

export function tileset(): Tileset {
  return TILESETS[state.id];
}

export function setTileset(id: TilesetId) {
  state.id = id;
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* storage unavailable */
  }
}
