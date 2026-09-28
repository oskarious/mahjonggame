// Rebuilding game state from a stored record: the engine is deterministic, so replaying the actions is enough.
import { type Action, type GameState, type RuleSet, applyAction, createGame } from '@mahjong/engine';

export function replayGame(rules: RuleSet, seed: string, actions: Action[]): GameState {
  let g = createGame(rules, seed).state;
  for (const a of actions) g = applyAction(g, a).state;
  return g;
}
