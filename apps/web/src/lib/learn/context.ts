import type { Exercise } from './types';

/** Context key: the lesson being rendered (its exercises and its parts). */
export const LESSON = Symbol('lesson');

export interface LessonContext {
  slug: string;
  exercises: Record<string, Exercise>;
  /**
   * The lesson's parts, registered in render order (the same on the server and the client), and the one shown.
   * Every part is in the HTML; only `current` is visible once scripts run.
   */
  parts: { titles: string[]; view: { current: number } };
}

/** Context key: tooltip ids (glossary terms, yaku) already shown in the current part (only the first use gets one). */
export const PART_TERMS = Symbol('part-terms');
