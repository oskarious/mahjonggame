// Runtime bot settings: defaults here, overrides stored in the `setting` table (key "bots"), changed by admins
// through the internal API. Everything is validated before it is applied or saved.
import type { BotSettings } from '@mahjong/protocol';

export type { BotSettings };

export const DEFAULT_BOT_SETTINGS: BotSettings = {
  botPoolMin: 120,
  botPoolMax: 1000,
  idleReserve: 30,
  backgroundEnabled: true,
  backgroundEveryMs: 45_000,
  warmupEveryMs: 2_000,
  warmupTables: 8,
  summonAfterMs: [3_000, 9_000],
  botArrivalMs: [2_000, 8_000],
  growAfterMs: 30_000,
  botRestMs: [10_000, 90_000],
  thinkScale: 1,
  thinkForcedMs: [300, 800],
  thinkCallMs: [800, 2_500],
  thinkTurnMs: 900,
  thinkPerTileMs: 60,
  thinkSpecialScale: 1.6,
  thinkOpeningScale: 1.8,
  longThinkPercent: 5,
  joinMedianMs: 1_500,
  joinMinMs: 400,
  readyMedianMs: 2_500,
  readyMinMs: 800,
  readySlowPercent: 8,
  readySlowFromMs: 6_000,
  timeoutPercent: 0.5,
};

export const SETTINGS_KEY = 'bots';

const DAY = 24 * 60 * 60_000;
type Range = [number, number];
type NumberKey = { [K in keyof BotSettings]: BotSettings[K] extends number ? K : never }[keyof BotSettings];
type RangeKey = { [K in keyof BotSettings]: BotSettings[K] extends Range ? K : never }[keyof BotSettings];

const NUMBERS: Record<NumberKey, { min: number; max: number; int: boolean }> = {
  botPoolMin: { min: 0, max: 10_000, int: true },
  botPoolMax: { min: 0, max: 10_000, int: true },
  idleReserve: { min: 0, max: 10_000, int: true },
  backgroundEveryMs: { min: 1_000, max: DAY, int: true },
  warmupEveryMs: { min: 100, max: DAY, int: true },
  warmupTables: { min: 0, max: 100, int: true },
  growAfterMs: { min: 0, max: DAY, int: true },
  thinkScale: { min: 0, max: 5, int: false },
  thinkTurnMs: { min: 0, max: 60_000, int: true },
  thinkPerTileMs: { min: 0, max: 5_000, int: true },
  thinkSpecialScale: { min: 0, max: 5, int: false },
  thinkOpeningScale: { min: 0, max: 5, int: false },
  longThinkPercent: { min: 0, max: 100, int: false },
  joinMedianMs: { min: 0, max: 60_000, int: true },
  joinMinMs: { min: 0, max: 60_000, int: true },
  readyMedianMs: { min: 0, max: 60_000, int: true },
  readyMinMs: { min: 0, max: 60_000, int: true },
  readySlowPercent: { min: 0, max: 100, int: false },
  readySlowFromMs: { min: 0, max: 60_000, int: true },
  timeoutPercent: { min: 0, max: 10, int: false },
};
const RANGES: Record<RangeKey, { max: number }> = {
  summonAfterMs: { max: 10 * 60_000 },
  botArrivalMs: { max: 10 * 60_000 },
  botRestMs: { max: DAY },
  thinkForcedMs: { max: 60_000 },
  thinkCallMs: { max: 60_000 },
};

/**
 * Applies a partial update to `base`. Returns the new settings, or an error naming the first bad field. Unknown keys
 * are rejected so typos do not silently do nothing.
 */
export function mergeSettings(base: BotSettings, patch: unknown): { settings: BotSettings } | { error: string } {
  if (typeof patch !== 'object' || patch === null || Array.isArray(patch)) return { error: 'Expected an object' };
  const next: BotSettings = structuredClone(base);
  for (const [key, v] of Object.entries(patch)) {
    if (key in NUMBERS) {
      const rule = NUMBERS[key as NumberKey];
      if (typeof v !== 'number' || !Number.isFinite(v) || v < rule.min || v > rule.max || (rule.int && !Number.isInteger(v))) {
        return { error: `${key} must be ${rule.int ? 'an integer' : 'a number'} from ${rule.min} to ${rule.max}` };
      }
      next[key as NumberKey] = v;
    } else if (key in RANGES) {
      const { max } = RANGES[key as RangeKey];
      const ok =
        Array.isArray(v) &&
        v.length === 2 &&
        v.every((x) => typeof x === 'number' && Number.isInteger(x) && x >= 0 && x <= max) &&
        v[0] <= v[1];
      if (!ok) return { error: `${key} must be [low, high] in ms with 0 ≤ low ≤ high ≤ ${max}` };
      next[key as RangeKey] = [v[0], v[1]];
    } else if (key === 'backgroundEnabled') {
      if (typeof v !== 'boolean') return { error: 'backgroundEnabled must be true or false' };
      next.backgroundEnabled = v;
    } else {
      return { error: `Unknown setting ${key}` };
    }
  }
  if (next.botPoolMin > next.botPoolMax) return { error: 'botPoolMin must not be above botPoolMax' };
  return { settings: next };
}

/** Stored overrides over the defaults; invalid stored values fall back to the defaults (and are logged). */
export function settingsFromStored(stored: unknown, log: (msg: string) => void = () => {}): BotSettings {
  if (stored === null || stored === undefined) return structuredClone(DEFAULT_BOT_SETTINGS);
  const r = mergeSettings(DEFAULT_BOT_SETTINGS, stored);
  if ('error' in r) {
    log(`ignoring stored bot settings: ${r.error}`);
    return structuredClone(DEFAULT_BOT_SETTINGS);
  }
  return r.settings;
}
