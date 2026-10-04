import type { ScenarioOptions, Seat, YakuId } from '@mahjong/engine';

/**
 * A lesson position: `scenario()` options (seat 0 is the reader), optionally followed by the seat on turn
 * discarding its drawn tile, which opens a call window (for call and ron exercises).
 */
export interface Position extends ScenarioOptions {
  discard?: boolean;
  /**
   * Tiles in other seats' rivers that were discarded after the riichi (`riichi`) and not won on: genbutsu too.
   * Ponds have no global order, so the position says which tiles came after.
   */
  passed?: string;
}

/**
 * What an exercise shows besides the hand (and the tile to act on). Everything is off by default: show only what the
 * question needs, a beginner shouldn't have to filter the rest.
 */
export interface Show {
  /** Discard rows (0 = yours, 1 right, 2 across, 3 left). */
  ponds?: Seat[];
  /** The round and dealer (panel), or the round wind (winning hands). */
  round?: boolean;
  /** Your seat wind and whether you are dealer (winning hands). */
  seat?: boolean;
  /** Dora indicator and dora (and their gold glow on tiles). */
  dora?: boolean;
  /** Tiles left in the wall (panel). */
  wall?: boolean;
  /** Counters and riichi sticks on the table (winning hands). */
  counters?: boolean;
}

/** Tile groups a pick exercise can ask for, decided by the engine's tile predicates. */
export type TileGroup = 'm' | 'p' | 's' | 'winds' | 'dragons' | 'honors' | 'terminals' | 'simples';

export type DiscardGoal =
  /** Leave the hand in tenpai. */
  | 'tenpai'
  /** Stay as close to winning as possible (lowest shanten after the discard). */
  | 'min-shanten'
  /** Lowest shanten and, among those, the most tiles that improve the hand. */
  | 'max-ukeire'
  /** Leave 1-shanten with the most tiles that reach tenpai on a good wait (`goodWaitAcceptance`). */
  | 'max-good-wait'
  /**
   * A rule of thumb the engine cannot decide alone (five blocks, keep a safe tile): the answers are `only`. The
   * lesson test still checks that each keeps the lowest shanten, unless the exercise sets `stepBack`.
   */
  | 'judgment'
  /** A tile the given seat (in riichi) has discarded: it cannot ron on it. */
  | { safeAgainst: Seat }
  /** The hand tiles in the best safety grade against the given seat (in riichi); see `safety.ts`. */
  | { safest: Seat };

export type PickGoal =
  /** Every kind that completes the hand (seat 0 holds 13 tiles). */
  | 'waits'
  /** The dora of every revealed indicator. */
  | 'dora'
  /** Number tiles no two-sided wait can complete, because a tile of each shape is all visible (kabe). */
  | 'no-chance'
  /** Every kind that brings the hand closer to winning (seat 0 holds 13 tiles). */
  | 'ukeire'
  | { group: TileGroup };

export type CallChoice = 'ron' | 'pon' | 'chii' | 'daiminkan' | 'pass';

/** "Can you win on this tile?": yes, or the reason you can't. */
export type Verdict = 'yes' | 'no-yaku' | 'furiten' | 'not-complete';

interface Base {
  /** Short task text; `{1m}` tokens render as tiles. */
  prompt: string;
  /** Shown with every correct answer (and after a reveal). */
  why?: string;
  show?: Show;
}

export type Exercise = Base &
  (
    | {
        kind: 'discard';
        position: Position;
        goal: DiscardGoal;
        only?: string;
        /** A judgment answer that deliberately leaves the hand further from tenpai. */
        stepBack?: boolean;
      }
    | { kind: 'pick'; position: Position; goal: PickGoal; from?: string }
    | { kind: 'call'; position: Position; goal: CallChoice }
    /** `expect`: the verdict the lesson text relies on, checked against the engine by the lesson test. */
    | { kind: 'can-win'; position: Position; expect?: Verdict }
    /** `expect`: the yaku the lesson text names, checked by the lesson test. */
    | {
        kind: 'yaku';
        position: Position;
        distractors?: YakuId[];
        expect?: YakuId[];
      }
    /** `expect`: the right option as the lesson text states it, checked by the lesson test. */
    | {
        kind: 'score';
        position: Position;
        ask: 'han' | 'han-fu' | 'points' | 'gain';
        expect?: string;
      }
    /** `expect`: the total fu the lesson text states, checked by the lesson test. */
    | { kind: 'fu'; position: Position; expect?: number }
    | {
        kind: 'choice';
        options: string[];
        answer: number;
        position?: Position;
        /** Facts about the shown hand the question relies on, checked against the engine by the lesson test. */
        claim?: Claim;
      }
  );

/** Facts about the shown hand (seat 0, 13 tiles) a question relies on, checked against the engine by the lesson test. */
export interface Claim {
  shanten?: number;
  /** Exactly these winning tiles. */
  waits?: string;
  tenpai?: boolean;
  /** Winning tiles (tenpai) or improving tiles still unseen by the reader. */
  liveWaits?: number;
  /** The wait can come in at least 5 copies (two-sided or better). */
  goodWait?: boolean;
  /** The least the hand wins by ron, without riichi (`minRon`). */
  minRon?: number;
}

export type ExerciseKind = Exercise['kind'];
export type ExerciseOf<K extends ExerciseKind> = Extract<Exercise, { kind: K }>;
export const EXERCISE_KINDS: ExerciseKind[] = ['discard', 'pick', 'call', 'can-win', 'yaku', 'score', 'fu', 'choice'];
