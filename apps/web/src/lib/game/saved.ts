import type { Action, RuleSet, Seat } from '@mahjong/engine';
import type { LocalSettings } from './local.svelte';

/**
 * Bump when an engine change makes old logs replay differently (wall generation, action shapes, RuleSet fields):
 * a save with another version is discarded instead of replayed.
 */
export const SAVE_VERSION = 2; // 2: ChaCha20 wall RNG
const KEY = 'riichi.localGame';

/** The offline game in progress: enough to rebuild it by replaying `actions`. */
export interface SavedGame {
  v: number;
  rules: RuleSet;
  seed: string;
  human: Seat;
  settings: LocalSettings;
  actions: Action[];
  /** Denormalized so the home page can label Continue without replaying. */
  round: { wind: number; dealer: Seat };
}

export function loadSave(): SavedGame | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as SavedGame;
    const ok =
      s?.v === SAVE_VERSION &&
      typeof s.rules === 'object' &&
      typeof s.seed === 'string' &&
      typeof s.human === 'number' &&
      typeof s.settings === 'object' &&
      Array.isArray(s.actions) &&
      typeof s.round?.wind === 'number' &&
      typeof s.round?.dealer === 'number';
    return ok ? s : null;
  } catch {
    return null;
  }
}

export function writeSave(s: Omit<SavedGame, 'v'>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ v: SAVE_VERSION, ...s }));
  } catch {
    // Storage blocked or full: play on unsaved.
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
