import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RULES,
  EMA_2025,
  countKinds,
  decomposeStandard,
  doraFromIndicator,
  isRedTile,
  kindOf,
  kindToString,
  parseTiles,
  shanten,
  waits,
} from '../src/index.ts';

const waitStr = (hand: string) => waits(parseTiles(hand), []).map(kindToString).join(' ');
const sh = (hand: string, melds = 0) => shanten(countKinds(parseTiles(hand)), melds);

describe('tiles', () => {
  it('parses notation, red fives and honours', () => {
    const tiles = parseTiles('19m0p5p7z');
    expect(tiles.map((t) => kindToString(kindOf(t)))).toEqual(['1m', '9m', '5p', '5p', '7z']);
    expect(isRedTile(tiles[2], DEFAULT_RULES.redFives)).toBe(true);
    expect(isRedTile(tiles[3], DEFAULT_RULES.redFives)).toBe(false);
    expect(isRedTile(tiles[2], EMA_2025.redFives)).toBe(false);
  });

  it('refuses a fifth copy', () => {
    expect(() => parseTiles('11111m')).toThrow();
  });

  it('computes dora from indicators, wrapping 9→1, north→east, red→white (EMA 2.7)', () => {
    const d = (s: string) => kindToString(doraFromIndicator(kindOf(parseTiles(s)[0])));
    expect(d('6s')).toBe('7s');
    expect(d('9m')).toBe('1m');
    expect(d('4z')).toBe('1z');
    expect(d('1z')).toBe('2z');
    expect(d('5z')).toBe('6z'); // white → green
    expect(d('6z')).toBe('7z'); // green → red
    expect(d('7z')).toBe('5z'); // red → white
  });
});

describe('waits', () => {
  it.each([
    ['123m456p789s55m23s', '1s 4s'], // two-sided
    ['123m456p789s55m24s', '3s'], // closed
    ['123m456p789s55m12s', '3s'], // edge
    ['123m456p789s234s5m', '5m'], // pair
    ['123m456p789s55m44s', '5m 4s'], // triplet
    ['1112345678999m', '1m 2m 3m 4m 5m 6m 7m 8m 9m'], // nine gates
    ['19m19p19s1234567z', '1m 9m 1p 9p 1s 9s 1z 2z 3z 4z 5z 6z 7z'], // 13-sided kokushi
    ['11m33m55p77p99s22z6z', '6z'], // seven pairs
    ['2223m123p456p789s', '1m 3m 4m'], // triplet + sequence shapes
  ])('%s waits on %s', (hand, expected) => {
    expect(waitStr(hand)).toBe(expected);
  });

  it('EMA 3.3.8 example 1: holding all four of the waiting tile is noten', () => {
    expect(waitStr('123m456m789m9999p')).toBe('');
  });

  it('EMA 3.3.8 example 2: tenpai even if every waiting tile is visible elsewhere', () => {
    expect(waitStr('123m456m789m999p1s')).toBe('1s');
  });

  it('EMA 3.3.9 furiten examples: waits of multi-sided hands', () => {
    expect(waitStr('33m111s12345678p')).toBe('3p 6p 9p');
    expect(waitStr('33m123s123s456s23p')).toBe('1p 4p');
    expect(waitStr('77z44456p123m123m')).toBe('4p 7p 7z');
  });

  it('seven pairs cannot use four identical tiles as two pairs', () => {
    expect(waitStr('1111m33m55p77p99s2z')).toBe('');
  });

  it('respects melds when counting held copies', () => {
    const used = new Set<number>();
    // Single wait on 4s while holding an open 444s: no fifth copy exists.
    const hand = parseTiles('123m456p789m4s', used);
    const pon = parseTiles('444s', used);
    expect(waits(hand, [{ type: 'pon', tiles: pon, called: pon[0], from: 0 }])).toEqual([]);
  });
});

describe('decomposition', () => {
  it('finds every reading of an ambiguous hand', () => {
    // 111222333m can be three triplets or three identical sequences.
    const shapes = decomposeStandard(countKinds(parseTiles('111222333m456p99s')));
    expect(shapes).toHaveLength(2);
  });
});

describe('shanten', () => {
  it.each([
    ['123m456p789s11z222z', -1],
    ['123m456p789s11z22z', 0],
    ['123m456p789s1z2z3z4z', 2],
    ['19m19p19s1234567z', 0], // kokushi tenpai
    ['19m19p19s123456z5m', 1],
    ['11m22m33p44p55s66s7z', 0], // seven pairs tenpai
  ])('%s = %i', (hand, expected) => {
    expect(sh(hand)).toBe(expected);
  });

  it('accounts for melds', () => {
    expect(sh('456p789s11z22z', 1)).toBe(0);
    expect(sh('11z', 4)).toBe(-1);
  });
});
