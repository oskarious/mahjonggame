import type { RedFives } from './tiles.ts';

export interface AbortiveDraws {
  /** Kyuushu kyuuhai: 9+ distinct terminals/honours on the first uninterrupted turn. */
  nineTerminals: boolean;
  /** Suufon renda: the same wind discarded by all four players in the first set of turns. */
  fourWinds: boolean;
  /** Suucha riichi: all four players in riichi. */
  fourRiichi: boolean;
  /** Suukaikan: four quads declared by more than one player. */
  fourKans: boolean;
  /** Sanchahou: three players ron the same tile. */
  tripleRon: boolean;
}

export interface RuleSet {
  id: string;
  /** East-only (tonpuusen) or east + south (hanchan). */
  length: 'east' | 'south';
  startingPoints: number;
  /** Subtracted from final scores before uma. */
  returnPoints: number;
  /** Uma by final placement, in points. */
  uma: [number, number, number, number];
  /** Ties in final score: split uma (EMA) or the seat closer to the initial dealer ranks higher. */
  tieBreak: 'split' | 'seatOrder';
  redFives: RedFives;
  /** The game ends when a player's score goes below zero. */
  bankruptcy: boolean;
  abortiveDraws: AbortiveDraws;
  /** Several players may ron the same discard; otherwise only the first in turn order (head bump). */
  multipleRon: boolean;
  /** Counters are paid to every ron winner (EMA) instead of only the first in turn order. */
  honbaToAllRonWinners: boolean;
  openTanyao: boolean;
  /** 4 han 30 fu and 3 han 60 fu are scored as mangan. */
  kiriageMangan: boolean;
  /** Fu for a pair that is both seat and round wind. */
  doubleWindPairFu: 2 | 4;
  /** 13+ han counts as yakuman; otherwise capped at sanbaiman. */
  kazoeYakuman: boolean;
  /** Several yakuman in one hand stack. */
  multipleYakuman: boolean;
  /** EMA: renhou is 5 han and does not combine with anything, i.e. a mangan. */
  renhou: 'none' | 'mangan' | 'yakuman';
  /** Thirteen orphans may rob a concealed quad. */
  kokushiRobsConcealedKan: boolean;
  /** Tiles that must remain in the wall to declare riichi. */
  riichiMinWallTiles: number;
  /** A player needs at least the deposit in points to declare riichi. */
  riichiNeedsPoints: boolean;
  /** Value of each counter for a win by discard (a third from each player on a self-draw). */
  honbaValue: number;
  riichiDeposit: number;
  notenPenalty: number;
}

/** European Mahjong Association riichi rules, 2025 edition. */
export const EMA_2025: RuleSet = {
  id: 'ema-2025',
  length: 'south',
  startingPoints: 30000,
  returnPoints: 30000,
  uma: [15000, 5000, -5000, -15000],
  tieBreak: 'split',
  redFives: { man: 0, pin: 0, sou: 0 },
  bankruptcy: false,
  abortiveDraws: { nineTerminals: false, fourWinds: false, fourRiichi: false, fourKans: false, tripleRon: false },
  multipleRon: true,
  honbaToAllRonWinners: true,
  openTanyao: true,
  kiriageMangan: true,
  doubleWindPairFu: 2,
  kazoeYakuman: false,
  multipleYakuman: false,
  renhou: 'mangan',
  kokushiRobsConcealedKan: true,
  riichiMinWallTiles: 1,
  riichiNeedsPoints: false,
  honbaValue: 300,
  riichiDeposit: 1000,
  notenPenalty: 3000,
};

/** Default online rules: EMA plus red fives, bankruptcy and abortive draws, east-only by default. */
export const DEFAULT_RULES: RuleSet = {
  ...EMA_2025,
  id: 'default',
  length: 'east',
  redFives: { man: 1, pin: 1, sou: 1 },
  bankruptcy: true,
  abortiveDraws: { nineTerminals: true, fourWinds: true, fourRiichi: true, fourKans: true, tripleRon: true },
  riichiNeedsPoints: true,
};

export function makeRules(base: RuleSet, overrides: Partial<RuleSet> = {}): RuleSet {
  return structuredClone({ ...base, ...overrides });
}
