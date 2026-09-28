import {
  type Action,
  type GameState,
  type HintLevel,
  type RedFives,
  type RuleSet,
  type Seat,
  applyAction,
  botAction,
  createGame,
  legalActions,
  pendingSeats,
  redactEvent,
  skillForElo,
  viewFor,
} from '@mahjong/engine';
import { DEFAULT_BOT_ELO } from '$lib/bots';
import { type GameSource, type StepListener, StepListeners } from './source';
import { type SavedGame, clearSave, writeSave } from './saved';

export interface LocalGameOptions {
  /** Keep the game in localStorage after every action, so /play can resume it. */
  autosave?: boolean;
  /** Actions to replay before play starts (restoring a saved game). Throws if one is illegal. */
  actions?: Action[];
}

export interface LocalSettings {
  hints: HintLevel;
  /** Target strength of the bots, in Elo. */
  botElo: number;
  /** Milliseconds a bot "thinks" before acting. */
  botDelay: number;
  /** In riichi, discard the drawn tile automatically when nothing else is possible. */
  autoRiichiDiscard: boolean;
  /** Pass on pon/chii/kan automatically (still asked for ron). */
  skipCalls: boolean;
  /** Debug: show the bots' hands. */
  reveal: boolean;
  /** Debug: a bot plays for the human too (still stops at the end of each hand). */
  autoplay: boolean;
}

export const DEFAULT_SETTINGS: LocalSettings = {
  hints: 'waits',
  botElo: DEFAULT_BOT_ELO,
  botDelay: 450,
  autoRiichiDiscard: true,
  skipCalls: false,
  reveal: false,
  autoplay: false,
};

/**
 * A game played entirely in the browser against bots. Exposes the same shape the online client
 * will: a player view plus `act()`, so the table UI does not care where the game runs.
 */
export class LocalGame implements GameSource {
  readonly human: Seat;
  readonly seed: string;
  readonly rules: RuleSet;
  readonly names: string[];
  state: GameState = $state.raw() as GameState;
  settings: LocalSettings = $state({ ...DEFAULT_SETTINGS });
  error: string | null = $state(null);
  /** Every action applied, for replays and bug reports. */
  readonly log: Action[] = [];
  view = $derived.by(() => viewFor(this.state, this.human, { hints: this.settings.hints }));
  #timer: ReturnType<typeof setTimeout> | null = null;
  #autosave: boolean;
  #listeners = new StepListeners();

  constructor(
    rules: RuleSet,
    seed: string,
    human: Seat,
    settings: Partial<LocalSettings> = {},
    options: LocalGameOptions = {},
  ) {
    this.rules = rules;
    this.seed = seed;
    this.human = human;
    this.names = [0, 1, 2, 3].map((s) => (s === human ? 'You' : `Bot ${'ABC'[(s - human + 3) % 4]}`));
    Object.assign(this.settings, settings);
    let state = createGame(rules, seed).state;
    for (const a of options.actions ?? []) {
      state = applyAction(state, a).state;
      this.log.push(a);
    }
    this.state = state;
    this.#autosave = options.autosave ?? false;
    this.#save();
    this.#schedule();
  }

  /** Rebuilds a saved game by replaying its log; throws if the log no longer replays. */
  static restore(saved: SavedGame): LocalGame {
    return new LocalGame(saved.rules, saved.seed, saved.human, saved.settings, {
      autosave: true,
      actions: saved.actions,
    });
  }

  act(action: Action): void {
    this.#apply(action);
    this.#schedule();
  }

  next(): void {
    this.act({ type: 'nextHand' });
  }

  listen(fn: StepListener): () => void {
    return this.#listeners.add(fn);
  }

  get red(): RedFives {
    return this.rules.redFives;
  }

  destroy(): void {
    if (this.#timer) clearTimeout(this.#timer);
  }

  /** Re-evaluates automation, e.g. after settings change. */
  poke(): void {
    this.#schedule();
  }

  exportLog(): string {
    return JSON.stringify({ rules: this.rules, seed: this.seed, human: this.human, actions: this.log });
  }

  #apply(action: Action): boolean {
    try {
      const { state, events } = applyAction(this.state, action);
      this.state = state;
      this.log.push(action);
      this.error = null;
      this.#save();
      this.#listeners.emit(
        events.map((e) => redactEvent(e, this.human)),
        this.view,
      );
      return true;
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
      return false;
    }
  }

  #save(): void {
    if (!this.#autosave) return;
    if (this.state.phase === 'gameOver') return clearSave();
    writeSave({
      rules: this.rules,
      seed: this.seed,
      human: this.human,
      settings: $state.snapshot(this.settings),
      actions: this.log,
      round: { wind: this.state.roundWind, dealer: this.state.dealer },
    });
  }

  #schedule(): void {
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = null;
    if (this.state.phase !== 'playing') return;
    const pending = pendingSeats(this.state);

    if (pending.includes(this.human)) {
      const auto = this.#autoHuman();
      if (auto) {
        this.#timer = setTimeout(() => this.act(auto), Math.min(this.settings.botDelay, 350));
        return;
      }
    }
    const bots = this.settings.autoplay ? pending : pending.filter((s) => s !== this.human);
    if (!bots.length) return;
    const onTurn = this.state.hand.step.type === 'turn';
    this.#timer = setTimeout(
      () => {
        for (const s of bots) {
          if (!pendingSeats(this.state).includes(s)) continue;
          const a = botAction(this.state, s, { skill: skillForElo(this.settings.botElo) });
          if (a) this.#apply(a);
        }
        this.#schedule();
      },
      onTurn ? this.settings.botDelay : this.settings.botDelay / 2,
    );
  }

  #autoHuman(): Action | null {
    const legal = legalActions(this.state, this.human);
    const p = this.state.hand.players[this.human];
    if (this.settings.autoRiichiDiscard && p.riichi && legal.every((a) => a.type === 'discard')) {
      return legal[0];
    }
    if (this.settings.skipCalls && legal.some((a) => a.type === 'pass') && !legal.some((a) => a.type === 'ron')) {
      return legal.find((a) => a.type === 'pass')!;
    }
    return null;
  }
}
