// Elo from placements: every game is three pairwise results per player. Pure. Bot players are rated like humans;
// only the anonymous bots of old records are fixed.
import type { HintLevel } from '@mahjong/engine';
import type { Config } from './config.ts';

export interface RatedSeat {
  /** Rating at the start of the game. */
  rating: number;
  /** Rated games played before this one (decides K). */
  games: number;
  /** Rating does not change (anonymous bots of games from before bot players). */
  fixed: boolean;
  /** Final points; placements are compared on these (equal = tie). */
  points: number;
}

type RatingConfig = Pick<Config, 'k' | 'kNew' | 'newGames'>;

export function expectedScore(mine: number, theirs: number): number {
  return 1 / (1 + 10 ** ((theirs - mine) / 400));
}

/** Rating change per seat (0 for fixed seats), rounded to integers. */
export function ratingChanges(seats: RatedSeat[], config: RatingConfig): number[] {
  return seats.map((me, i) => {
    if (me.fixed) return 0;
    const k = me.games < config.newGames ? config.kNew : config.k;
    let sum = 0;
    seats.forEach((other, j) => {
      if (j === i) return;
      const s = me.points > other.points ? 1 : me.points < other.points ? 0 : 0.5;
      sum += s - expectedScore(me.rating, other.rating);
    });
    return Math.round((k / 3) * sum);
  });
}

const ORDER: HintLevel[] = ['off', 'distance', 'full'];

/** The most help a player of this rating gets online. */
export function hintLevelForRating(rating: number, config: Pick<Config, 'hintThresholds'>): HintLevel {
  if (rating < config.hintThresholds.distance) return 'distance';
  return 'off';
}

/** A client may lower its hint level, never raise it. */
export function clampHints(allowed: HintLevel, wanted: HintLevel): HintLevel {
  return ORDER[Math.min(ORDER.indexOf(allowed), ORDER.indexOf(wanted))];
}
