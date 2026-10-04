import { BOT_PRESETS } from '../bots';

/** "Play a bot" from the course: a short East-only game against the weakest bots, with full hints. */
export const BEGINNER_PLAY = `/play?${new URLSearchParams({
  preset: 'default',
  length: 'east',
  bots: String(BOT_PRESETS[0]),
  hints: 'full',
})}`;
