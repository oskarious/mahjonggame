// The stream of problems on a trainer page: the next one is generated while the reader works on the current one, so
// Next is instant (generating plays a bot game, tens of milliseconds).
import type { Exercise } from '../learn/types';
import { type Level, type TrainerId, generate } from './generate';
import { newSeed } from './registry';

export interface Problem {
  level: Level;
  seed: string;
  exercise: Exercise;
}

export class Feed {
  private ahead: Problem | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly trainer: TrainerId) {}

  /** A new problem at `level`: the prepared one if it fits. */
  next(level: Level): Problem {
    const p = this.ahead?.level === level ? this.ahead : this.make(level);
    this.ahead = null;
    return p;
  }

  /** Prepares the next problem after the browser has painted the current one. */
  prefetch(level: Level): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (this.ahead?.level !== level) this.ahead = this.make(level);
    }, 120);
  }

  stop(): void {
    clearTimeout(this.timer);
  }

  private make(level: Level): Problem {
    const seed = newSeed();
    return { level, seed, exercise: generate(this.trainer, level, seed) };
  }
}
