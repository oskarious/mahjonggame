// Which cues a game step plays. Pure: takes the step's events (redacted for the own seat) and the own view after the
// step, nothing else, so sounds can never tell more than the screen does.
import type { GameEvent, HandResult, PlayerView, Seat } from '@mahjong/engine';
import type { SoundId } from './sounds';

export interface Cue {
  id: SoundId;
  /** ms after the step. */
  delay?: number;
}

/** What the mapping remembers between steps. */
export interface CueState {
  /** Seat whose kan was announced by a robbing window (`kanAttempt`), so its `kan` doesn't announce it again. */
  kanAttempt: Seat | null;
  /** `view.seq` of the call window `callAvailable` last played for. */
  callSeq: number | null;
}

export type CueView = Pick<PlayerView, 'seat' | 'seq' | 'claimable' | 'actions'>;

export const WIN_DELAY = 700;
export const GAME_END_DELAY = 1600;

export function initialCueState(): CueState {
  return { kanAttempt: null, callSeq: null };
}

export function cuesFor(events: GameEvent[], view: CueView, state: CueState): { cues: Cue[]; state: CueState } {
  const cues: Cue[] = [];
  let { kanAttempt, callSeq } = state;
  const cue = (id: SoundId, delay?: number) => cues.push(delay ? { id, delay } : { id });

  for (const e of events) {
    switch (e.type) {
      case 'handStart':
        kanAttempt = null;
        callSeq = null;
        cue('handStart');
        break;
      case 'draw':
        if (e.seat === view.seat && e.tile !== null) {
          cue('tileDraw');
          if (!e.rinshan) cue('yourTurn');
        }
        break;
      case 'discard':
        if (e.riichi) cue('callRiichi');
        cue('tilePlace');
        break;
      case 'riichiAccepted':
        cue('riichiStick');
        break;
      case 'call':
        cue(e.meld.type === 'chii' ? 'callChii' : e.meld.type === 'pon' ? 'callPon' : 'callKan');
        cue('meldPlace');
        break;
      case 'kanAttempt':
        kanAttempt = e.seat;
        cue('callKan');
        break;
      case 'kan':
        if (kanAttempt !== e.seat) cue('callKan');
        kanAttempt = null;
        cue('meldPlace');
        break;
      case 'dora':
        cue('doraFlip');
        break;
      case 'handEnd':
        kanAttempt = null;
        resultCues(e.result, cue);
        break;
      case 'gameEnd':
        cue(e.final[0]?.seat === view.seat ? 'gameEndFirst' : 'gameEnd', GAME_END_DELAY);
        break;
    }
  }

  // Whether *we* can call is only in the own view; the events deliberately don't say.
  if (view.claimable && view.actions.some((a) => a.type !== 'pass') && callSeq !== view.seq) {
    callSeq = view.seq;
    cue('callAvailable');
  }

  return { cues, state: { kanAttempt, callSeq } };
}

function resultCues(result: HandResult, cue: (id: SoundId, delay?: number) => void): void {
  switch (result.type) {
    case 'win': {
      if (!result.wins.length) return;
      cue(result.wins.some((w) => w.from === null) ? 'callTsumo' : 'callRon');
      const best = result.wins.reduce((a, b) => (b.value.basePoints > a.value.basePoints ? b : a));
      const limit = best.value.limit;
      cue(limit === 'yakuman' ? 'winYakuman' : limit === 'none' ? 'winHand' : 'winLimit', WIN_DELAY);
      return;
    }
    case 'exhaustive':
      cue('drawExhaustive');
      return;
    case 'abortive':
      cue('drawAbortive');
      return;
  }
}
