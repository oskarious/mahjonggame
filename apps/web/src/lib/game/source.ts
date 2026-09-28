import type { Action, GameEvent, PlayerView, RedFives } from '@mahjong/engine';

/** Receives each applied step's events (redacted for the own seat) and the own view after it. */
export type StepListener = (events: GameEvent[], view: PlayerView) => void;

/** What the table screen needs from a game, whether it runs in the browser (LocalGame) or on the server (RemoteGame). */
export interface GameSource {
  readonly view: PlayerView;
  readonly names: string[];
  readonly red: RedFives;
  readonly error: string | null;
  act(action: Action): void;
  /** Continue after a hand result: the next hand locally, "ready" online. */
  next(): void;
  /** Subscribe to live steps (not replayed history or resyncs); returns the unsubscribe function. */
  listen(fn: StepListener): () => void;
}

/** A listener set whose calls never throw into the game. */
export class StepListeners {
  #fns = new Set<StepListener>();

  add(fn: StepListener): () => void {
    this.#fns.add(fn);
    return () => this.#fns.delete(fn);
  }

  emit(events: GameEvent[], view: PlayerView): void {
    if (!events.length) return;
    for (const fn of this.#fns) {
      try {
        fn(events, view);
      } catch (e) {
        console.error(e);
      }
    }
  }
}
