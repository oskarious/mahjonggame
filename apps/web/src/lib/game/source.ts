import type { Action, PlayerView, RedFives } from '@mahjong/engine';

/** What the table screen needs from a game, whether it runs in the browser (LocalGame) or on the server (RemoteGame). */
export interface GameSource {
  readonly view: PlayerView;
  readonly names: string[];
  readonly red: RedFives;
  readonly error: string | null;
  act(action: Action): void;
  /** Continue after a hand result: the next hand locally, "ready" online. */
  next(): void;
}
