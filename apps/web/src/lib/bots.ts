import { BOT_ELO_RANGE } from '@mahjong/engine';

/** Five opponent strengths spread evenly over what the bots can play at, rounded to tens. */
export const BOT_PRESETS: number[] = (() => {
  const [lo, hi] = BOT_ELO_RANGE;
  return Array.from({ length: 5 }, (_, i) => Math.round((lo + ((hi - lo) * i) / 4) / 10) * 10);
})();

export const DEFAULT_BOT_ELO = BOT_PRESETS[2];

/** Parses a bot Elo from a URL parameter, falling back to the default. */
export function parseBotElo(value: string | null): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_BOT_ELO;
}
