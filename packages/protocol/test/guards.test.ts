import { describe, expect, it } from 'vitest';
import { MAX_MESSAGE_BYTES, isAction, isClientMessage, parseClientMessage } from '../src/index.ts';

describe('client message guards', () => {
  it('accepts every valid message shape', () => {
    const ok = [
      { type: 'hello', version: 1 },
      { type: 'queue.join', format: 'east' },
      { type: 'queue.join', format: 'south' },
      { type: 'queue.leave' },
      { type: 'act', gameId: 'g1', seq: 12, action: { type: 'discard', seat: 2, tile: 17 } },
      { type: 'act', gameId: 'g1', seq: 0, action: { type: 'discard', seat: 0, tile: 0, riichi: true } },
      { type: 'act', gameId: 'g1', seq: 3, action: { type: 'pon', seat: 1, tiles: [4, 5] } },
      { type: 'act', gameId: 'g1', seq: 3, action: { type: 'chii', seat: 1, tiles: [4, 9] } },
      { type: 'act', gameId: 'g1', seq: 3, action: { type: 'kan', seat: 3, kind: 33 } },
      { type: 'act', gameId: 'g1', seq: 3, action: { type: 'pass', seat: 3 } },
      { type: 'act', gameId: 'g1', seq: 3, action: { type: 'ron', seat: 3 } },
      { type: 'act', gameId: 'g1', seq: 3, action: { type: 'tsumo', seat: 3 } },
      { type: 'act', gameId: 'g1', seq: 3, action: { type: 'daiminkan', seat: 3 } },
      { type: 'act', gameId: 'g1', seq: 3, action: { type: 'kyuushu', seat: 3 } },
      { type: 'ready', gameId: 'g1' },
      { type: 'resync' },
      { type: 'ping' },
    ];
    for (const m of ok) expect(isClientMessage(m), JSON.stringify(m)).toBe(true);
  });

  it('rejects malformed messages', () => {
    const bad: unknown[] = [
      null,
      42,
      'hello',
      [],
      {},
      { type: 'nope' },
      { type: 'hello' },
      { type: 'hello', version: '1' },
      { type: 'hello', version: 1.5 },
      { type: 'queue.join' },
      { type: 'queue.join', format: 'north' },
      { type: 'act', seq: 1, action: { type: 'pass', seat: 0 } },
      { type: 'act', gameId: '', seq: 1, action: { type: 'pass', seat: 0 } },
      { type: 'act', gameId: 'g', seq: -1, action: { type: 'pass', seat: 0 } },
      { type: 'act', gameId: 'g', seq: 1, action: { type: 'nextHand' } },
      { type: 'act', gameId: 'g', seq: 1, action: { type: 'pass', seat: 4 } },
      { type: 'act', gameId: 'g', seq: 1, action: { type: 'discard', seat: 0, tile: 136 } },
      { type: 'act', gameId: 'g', seq: 1, action: { type: 'discard', seat: 0, tile: 1, riichi: 'yes' } },
      { type: 'act', gameId: 'g', seq: 1, action: { type: 'discard', seat: 0, tile: 1, extra: 1 } },
      { type: 'act', gameId: 'g', seq: 1, action: { type: 'kan', seat: 0, kind: 34 } },
      { type: 'act', gameId: 'g', seq: 1, action: { type: 'pon', seat: 0, tiles: [1, 2, 3, 4] } },
      { type: 'act', gameId: 'g', seq: 1, action: { type: 'pon', seat: 0, tiles: ['1m'] } },
      { type: 'ready' },
      { type: 'hints', level: 'off' },
    ];
    for (const m of bad) expect(isClientMessage(m), JSON.stringify(m)).toBe(false);
  });

  it('isAction rejects non-objects and unknown keys', () => {
    expect(isAction('discard')).toBe(false);
    expect(isAction(Object.create(null))).toBe(false);
    expect(isAction({ type: 'pass', seat: 1, tile: 3 })).toBe(false);
  });

  it('parseClientMessage handles JSON errors and size limits', () => {
    expect(parseClientMessage('{"type":"ping"}')).toEqual({ type: 'ping' });
    expect(parseClientMessage('{bad json')).toBeNull();
    expect(parseClientMessage('"ping"')).toBeNull();
    expect(parseClientMessage('{"type":"ping"}', MAX_MESSAGE_BYTES + 1)).toBeNull();
    const padded = JSON.stringify({ type: 'ping', pad: 'x'.repeat(MAX_MESSAGE_BYTES) });
    expect(parseClientMessage(padded)).toBeNull();
  });
});
