// Ranks: named Elo spans, each split into sub-ranks 1 (lowest) to 5. Derived from the rating, never stored; shared by
// the web app and the game server. Spans are offset so the default start rating (1000) sits mid-Silver (Silver 3);
// move them together with `startRating`.
// `colors` are three shades of the rank's metal, used like the Kenney rank art does: light for top faces, mid and dark
// for the two sides. Gold's mid is the theme's --accent.

export const RANKS = [
  { id: 'iron', name: 'Iron', min: -Infinity, colors: { light: '#9aa3ad', mid: '#7d8792', dark: '#646d78' } },
  { id: 'bronze', name: 'Bronze', min: 625, colors: { light: '#c97147', mid: '#b1613a', dark: '#a3532d' } },
  { id: 'silver', name: 'Silver', min: 875, colors: { light: '#e4e7eb', mid: '#c9ced5', dark: '#aeb5be' } },
  { id: 'gold', name: 'Gold', min: 1125, colors: { light: '#fbdb7e', mid: '#f2c14e', dark: '#d9a431' } },
  { id: 'platinum', name: 'Platinum', min: 1375, colors: { light: '#b5ede3', mid: '#86d8ca', dark: '#5fbfb0' } },
  { id: 'diamond', name: 'Diamond', min: 1625, colors: { light: '#a9d6ff', mid: '#78b9f5', dark: '#5299e0' } },
  { id: 'master', name: 'Master', min: 1875, colors: { light: '#d3a6f5', mid: '#b37ce6', dark: '#9658cf' } },
] as const;

export type Rank = (typeof RANKS)[number];
export type RankId = Rank['id'];
export type SubRank = 1 | 2 | 3 | 4 | 5;

/** Rating points per sub-rank (5 per rank). */
export const SUBRANK_SIZE = 50;

export interface RankInfo {
  rank: Rank;
  sub: SubRank;
  /** E.g. "Silver 3". */
  label: string;
}

const clampSub = (n: number) => Math.min(5, Math.max(1, n)) as SubRank;

export function rankForRating(rating: number): RankInfo {
  let i = 0;
  if (!Number.isNaN(rating)) {
    i = RANKS.length - 1;
    while (rating < RANKS[i].min) i--;
  }
  const rank = RANKS[i];
  const next = RANKS[i + 1];
  // Counted down from the next rank so the unbounded Iron works; the top rank has no next and counts up instead.
  const sub = Number.isNaN(rating)
    ? 1
    : next
      ? clampSub(6 - Math.ceil((next.min - rating) / SUBRANK_SIZE))
      : clampSub(1 + Math.floor((rating - rank.min) / SUBRANK_SIZE));
  return { rank, sub, label: `${rank.name} ${sub}` };
}
