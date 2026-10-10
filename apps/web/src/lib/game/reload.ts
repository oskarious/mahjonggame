// Reloading the page to pick up a new deploy, at most once a minute per tab: while web and the game server roll out
// at different moments a fresh page can still be rejected, and must not reload in a loop.
const KEY = 'riichi:reloadedAt';
export const RELOAD_GUARD_MS = 60_000;

/** Reloads unless this tab already did within `RELOAD_GUARD_MS` (or has no storage to tell); false when it won't. */
export function reloadForUpdate(
  storage: () => Pick<Storage, 'getItem' | 'setItem'> = () => sessionStorage,
  now = Date.now(),
  reload = () => location.reload(),
): boolean {
  try {
    const s = storage();
    const last = Number(s.getItem(KEY));
    if (last && now - last < RELOAD_GUARD_MS) return false;
    s.setItem(KEY, String(now));
  } catch {
    return false;
  }
  reload();
  return true;
}
