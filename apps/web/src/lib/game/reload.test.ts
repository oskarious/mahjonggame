import { describe, expect, it, vi } from 'vitest';
import { RELOAD_GUARD_MS, reloadForUpdate } from './reload';

function memory() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
}

describe('reloadForUpdate', () => {
  it('reloads once, then not again within the guard window, then again after it', () => {
    const s = memory();
    const reload = vi.fn();
    expect(reloadForUpdate(() => s, 1_000_000, reload)).toBe(true);
    expect(reloadForUpdate(() => s, 1_000_000 + RELOAD_GUARD_MS - 1, reload)).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(reloadForUpdate(() => s, 1_000_000 + RELOAD_GUARD_MS, reload)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('does not reload without storage', () => {
    const reload = vi.fn();
    const blocked = () => {
      throw new Error('SecurityError');
    };
    expect(reloadForUpdate(blocked, 1_000_000, reload)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
