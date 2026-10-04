import type { Exercise } from '@mahjong/drills/types';

/**
 * What one `<Exercise id>` in a lesson plays: variants of the same idea and task, shown one after another in the same
 * card (the first is the one in the server-rendered HTML). Lesson-only: trainers and stored daily hands use `Exercise`.
 */
export type ExerciseSet = Exercise[];

/** Context key: the lesson being rendered (its exercises and its parts). */
export const LESSON = Symbol('lesson');

export interface LessonContext {
  slug: string;
  exercises: Record<string, ExerciseSet>;
  /**
   * The lesson's parts, registered in render order (the same on the server and the client), and the one shown.
   * Every part is in the HTML; only `current` is visible once scripts run.
   */
  parts: { titles: string[]; view: { current: number } };
}

/** Context key: tooltip ids (glossary terms, yaku) already shown in the current part (only the first use gets one). */
export const PART_TERMS = Symbol('part-terms');
