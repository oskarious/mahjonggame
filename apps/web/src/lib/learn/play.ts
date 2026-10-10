import { BOT_PRESETS } from '../bots';

/** "Play a bot" from the course: a short East-only game against the weakest bots, with full hints. /play is disallowed
 * in robots.txt, so links to it carry rel="nofollow" (otherwise crawlers report it as blocked). */
export const BEGINNER_PLAY = `/play?${new URLSearchParams({
  preset: 'default',
  length: 'east',
  bots: String(BOT_PRESETS[0]),
  hints: 'full',
})}`;
