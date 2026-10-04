import type { ScenarioOptions, Seat, YakuId } from '@mahjong/engine';

/**
 * A lesson position: `scenario()` options (seat 0 is the reader), optionally followed by the seat on turn
 * discarding its drawn tile, which opens a call window (for call and ron exercises).
 */
export interface Position extends ScenarioOptions {
  discard?: boolean;
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
  /** A tile the given seat (in riichi) has discarded: it cannot ron on it. */
  | { safeAgainst: Seat };

export type PickGoal =
  /** Every kind that completes the hand (seat 0 holds 13 tiles). */
  | 'waits'
  /** The dora of every revealed indicator. */
  | 'dora'
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
    | { kind: 'discard'; position: Position; goal: DiscardGoal; only?: string }
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
        claim?: { shanten?: number; waits?: string };
      }
  );

export type ExerciseKind = Exercise['kind'];
export type ExerciseOf<K extends ExerciseKind> = Extract<Exercise, { kind: K }>;
export const EXERCISE_KINDS: ExerciseKind[] = ['discard', 'pick', 'call', 'can-win', 'yaku', 'score', 'fu', 'choice'];
