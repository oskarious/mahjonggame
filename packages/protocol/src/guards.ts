// Hand-written validation of incoming client messages: shape only. Whether an action is legal is the engine's call.
import type { Action } from '@mahjong/engine';
import { type ClientMessage, type Format, FORMATS, MAX_MESSAGE_BYTES } from './messages.ts';

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown, lo: number, hi: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
const isSeat = (v: unknown): v is number => isInt(v, 0, 3);
/** Tile ids are 0-135; kinds 0-33. Exact validity is checked by the engine against the game state. */
const isTile = (v: unknown): v is number => isInt(v, 0, 135);
const isKind = (v: unknown): v is number => isInt(v, 0, 33);
const isTiles = (v: unknown, max: number): v is number[] => Array.isArray(v) && v.length <= max && v.every(isTile);

/** A UUID in its canonical 8-4-4-4-12 hex form, as every database id is. Check ids from outside with it before querying. */
export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

export function isFormat(v: unknown): v is Format {
  return typeof v === 'string' && (FORMATS as readonly string[]).includes(v);
}

function keysWithin(o: Obj, allowed: string[]): boolean {
  return Object.keys(o).every((k) => allowed.includes(k));
}

/** Shape check of a game action. Clients never send `nextHand` (the room advances hands itself). */
export function isAction(v: unknown): v is Exclude<Action, { type: 'nextHand' }> {
  if (!isObj(v) || !isSeat(v.seat)) return false;
  switch (v.type) {
    case 'discard':
      return (
        isTile(v.tile) &&
        (v.riichi === undefined || typeof v.riichi === 'boolean') &&
        keysWithin(v, ['type', 'seat', 'tile', 'riichi'])
      );
    case 'kan':
      return isKind(v.kind) && keysWithin(v, ['type', 'seat', 'kind']);
    case 'pon':
    case 'chii':
      return isTiles(v.tiles, 3) && keysWithin(v, ['type', 'seat', 'tiles']);
    case 'tsumo':
    case 'kyuushu':
    case 'ron':
    case 'daiminkan':
    case 'pass':
      return keysWithin(v, ['type', 'seat']);
    default:
      return false;
  }
}

/** Validates a decoded JSON value as a client message. */
export function isClientMessage(v: unknown): v is ClientMessage {
  if (!isObj(v)) return false;
  switch (v.type) {
    case 'hello':
      return isInt(v.version, 0, 1_000_000);
    case 'queue.join':
      return isFormat(v.format);
    case 'queue.leave':
    case 'resync':
    case 'ping':
      return true;
    case 'act':
      return isUuid(v.gameId) && isInt(v.seq, 0, 1_000_000_000) && isAction(v.action);
    case 'ready':
      return isUuid(v.gameId);
    default:
      return false;
  }
}

/**
 * Parses a raw frame into a client message, or null if it is too large, not JSON, or not a known shape.
 * `size` is the frame length in bytes (for a UTF-8 string, `Buffer.byteLength`); defaults to the string length.
 */
export function parseClientMessage(raw: string, size = raw.length): ClientMessage | null {
  if (size > MAX_MESSAGE_BYTES) return null;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  return isClientMessage(v) ? v : null;
}
