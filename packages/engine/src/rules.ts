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
  /**
   * Riichi deposits on a multiple ron: each winner takes back their own deposit from this hand and the rest goes to
   * the first winner in turn order (EMA), or the first winner takes them all (Tenhou).
   */
  depositsToFirstRonWinner: boolean;
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
  /**
   * Tenpai at an exhaustive draw when the only wait is a tile the player has all other copies of: noten if any four of
   * their tiles are that kind, melded or not, or only if four are concealed (Tenhou: a pon plus a single wait counts).
   */
  deadWaitCopies: 'all' | 'concealed';
  /**
   * A concealed quad after riichi (always with the drawn tile): the waits must not change and the three tiles must be
   * a triplet in every winning hand (EMA), or only the waits must not change (Tenhou).
   */
  riichiAnkan: 'tripletOnly' | 'sameWaits';
  /** Tiles that must remain in the wall to declare riichi. */
  riichiMinWallTiles: number;
  /** A player needs at least the deposit in points to declare riichi. */
  riichiNeedsPoints: boolean;
  /** Value of each counter for a win by discard (a third from each player on a self-draw). */
  honbaValue: number;
  riichiDeposit: number;
  notenPenalty: number;
  /**
   * When the new dora of an open or added quad is revealed: at once (EMA), or when its player discards or declares
   * another quad (Tenhou), so a win on the replacement tile does not count it. Concealed quads always reveal at once.
   */
  openKanDora: 'immediate' | 'afterDiscard';
  /**
   * Nagashi mangan: at an exhaustive draw, a player whose discards are all terminals and honours, none of them claimed,
   * is paid a mangan as if by self-draw (instead of the noten payments).
   */
  nagashiMangan: boolean;
  /** A dealer who wins or is tenpai in the last hand while leading with at least the return points ends the game. */
  dealerStopsAllLast: boolean;
  /**
   * If nobody has the return points when the last round ends, the next wind round is played as sudden death: the game
   * ends after the first hand that leaves someone at or above them, or after that round at the latest.
   */
  suddenDeath: boolean;
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
  depositsToFirstRonWinner: false,
  openTanyao: true,
  kiriageMangan: true,
  doubleWindPairFu: 2,
  kazoeYakuman: false,
  multipleYakuman: false,
  renhou: 'mangan',
  kokushiRobsConcealedKan: true,
  deadWaitCopies: 'all',
  riichiAnkan: 'tripletOnly',
  riichiMinWallTiles: 1,
  riichiNeedsPoints: false,
  honbaValue: 300,
  riichiDeposit: 1000,
  notenPenalty: 3000,
  openKanDora: 'immediate',
  nagashiMangan: false,
  dealerStopsAllLast: false,
  suddenDeath: false,
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

/**
 * Tenhou's ranked four-player rules (red fives, open tanyao). Used to replay Tenhou game logs as a correctness oracle
 * for the engine (test/tenhou); not offered for play.
 */
export const TENHOU: RuleSet = {
  id: 'tenhou',
  length: 'south',
  startingPoints: 25000,
  returnPoints: 30000,
  // Uma +20/+10/-10/-20, plus the 20,000 oka (4 x 5,000 below the return points) to the winner.
  uma: [40000, 10000, -10000, -20000],
  tieBreak: 'seatOrder',
  redFives: { man: 1, pin: 1, sou: 1 },
  bankruptcy: true,
  abortiveDraws: { nineTerminals: true, fourWinds: true, fourRiichi: true, fourKans: true, tripleRon: true },
  multipleRon: true,
  honbaToAllRonWinners: false,
  depositsToFirstRonWinner: true,
  openTanyao: true,
  kiriageMangan: false,
  doubleWindPairFu: 4,
  kazoeYakuman: true,
  multipleYakuman: true,
  renhou: 'none',
  kokushiRobsConcealedKan: true,
  deadWaitCopies: 'concealed',
  riichiAnkan: 'sameWaits',
  riichiMinWallTiles: 4,
  riichiNeedsPoints: true,
  honbaValue: 300,
  riichiDeposit: 1000,
  notenPenalty: 3000,
  openKanDora: 'afterDiscard',
  nagashiMangan: true,
  dealerStopsAllLast: true,
  suddenDeath: true,
};

export function makeRules(base: RuleSet, overrides: Partial<RuleSet> = {}): RuleSet {
  return structuredClone({ ...base, ...overrides });
}
