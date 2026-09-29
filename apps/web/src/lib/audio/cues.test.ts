import { describe, expect, it } from 'vitest';
import {
  type Action,
  DEFAULT_RULES,
  type GameEvent,
  type GameState,
  type Seat,
  applyAction,
  botAction,
  createGame,
  pendingSeats,
  randomInt,
  redactEvent,
  seedRng,
  viewFor,
} from '@mahjong/engine';
import { type CueState, type CueView, GAME_END_DELAY, WIN_DELAY, cuesFor, initialCueState } from './cues';
import { SOUNDS } from './sounds';

const ME: Seat = 0;
const idle: CueView = { seat: ME, seq: 1, claimable: null, actions: [] };

function ids(events: GameEvent[], view: CueView = idle, state: CueState = initialCueState()) {
  return cuesFor(events, view, state).cues.map((c) => c.id);
}

const ev = (e: unknown) => e as GameEvent;
const discard = (seat: Seat, riichi = false) => ev({ type: 'discard', seat, tile: 10, tsumogiri: false, riichi });
const meld = (type: string) => ({ type, tiles: [1, 2, 3], called: 1, from: 3 });
const win = (from: Seat | null, limit: string, basePoints: number, seat: Seat = 1) => ({
  seat,
  from,
  winTile: 1,
  hand: [],
  melds: [],
  value: { limit, basePoints },
  pao: null,
});
const handEnd = (result: unknown) => ev({ type: 'handEnd', result, scores: [0, 0, 0, 0] });

describe('cuesFor', () => {
  it('plays a tile sound for every discard, own or not', () => {
    expect(ids([discard(2)])).toEqual(['tilePlace']);
    expect(ids([discard(ME)])).toEqual(['tilePlace']);
  });

  it('riichi: call + tile on the discard, stick on acceptance', () => {
    expect(ids([discard(ME, true)])).toEqual(['callRiichi', 'tilePlace']);
    expect(ids([discard(1, true)])).toEqual(['callRiichiOther', 'tilePlace']);
    expect(ids([ev({ type: 'riichiAccepted', seat: 1, scores: [] })])).toEqual(['riichiStick']);
  });

  it('calls by meld type, own or an opponent', () => {
    expect(ids([ev({ type: 'call', seat: ME, meld: meld('chii') })])).toEqual(['callChii', 'meldPlace']);
    expect(ids([ev({ type: 'call', seat: ME, meld: meld('pon') })])).toEqual(['callPon', 'meldPlace']);
    expect(ids([ev({ type: 'call', seat: ME, meld: meld('daiminkan') })])).toEqual(['callKan', 'meldPlace']);
    expect(ids([ev({ type: 'call', seat: 1, meld: meld('chii') })])).toEqual(['callChiiOther', 'meldPlace']);
    expect(ids([ev({ type: 'call', seat: 1, meld: meld('pon') })])).toEqual(['callPonOther', 'meldPlace']);
    expect(ids([ev({ type: 'call', seat: 1, meld: meld('daiminkan') })])).toEqual(['callKanOther', 'meldPlace']);
  });

  it('kan without a robbing window: announced once, then the dora flip', () => {
    expect(ids([ev({ type: 'kan', seat: 2, meld: meld('ankan') }), ev({ type: 'dora', indicator: 5 })])).toEqual([
      'callKanOther',
      'meldPlace',
      'doraFlip',
    ]);
    expect(ids([ev({ type: 'kan', seat: ME, meld: meld('ankan') })])).toEqual(['callKan', 'meldPlace']);
  });

  it('added kan with a robbing window: callKan only on the attempt', () => {
    const first = cuesFor([ev({ type: 'kanAttempt', seat: 2, tile: 5 })], idle, initialCueState());
    expect(first.cues.map((c) => c.id)).toEqual(['callKanOther']);
    const second = cuesFor(
      [ev({ type: 'kan', seat: 2, meld: meld('shouminkan') }), ev({ type: 'dora', indicator: 5 })],
      idle,
      first.state,
    );
    expect(second.cues.map((c) => c.id)).toEqual(['meldPlace', 'doraFlip']);
    // The next kan of that seat is announced again.
    expect(ids([ev({ type: 'kan', seat: 2, meld: meld('ankan') })], idle, second.state)).toContain('callKanOther');
  });

  it('own draw prompts the turn; rinshan and other seats do not', () => {
    expect(ids([ev({ type: 'draw', seat: ME, tile: 4, rinshan: false })])).toEqual(['tileDraw', 'yourTurn']);
    expect(ids([ev({ type: 'draw', seat: ME, tile: 4, rinshan: true })])).toEqual(['tileDraw']);
    expect(ids([ev({ type: 'draw', seat: 1, tile: null, rinshan: false })])).toEqual([]);
  });

  it('wins: tsumo / ron, own or an opponent, graded by the best hand, after a delay', () => {
    const own = cuesFor([handEnd({ type: 'win', wins: [win(null, 'none', 800, ME)] })], idle, initialCueState());
    expect(own.cues).toEqual([{ id: 'callTsumo' }, { id: 'winHand', delay: WIN_DELAY }]);
    expect(ids([handEnd({ type: 'win', wins: [win(2, 'mangan', 2000, ME)] })])).toEqual(['callRon', 'winLimit']);
    expect(ids([handEnd({ type: 'win', wins: [win(null, 'none', 800)] })])).toEqual(['callTsumoOther', 'winHand']);
    expect(ids([handEnd({ type: 'win', wins: [win(2, 'yakuman', 8000)] })])).toEqual(['callRonOther', 'winYakuman']);
  });

  it('double ron: one call, ours if we are in it, graded by the higher win', () => {
    const wins = [win(3, 'none', 1000, 1), win(3, 'haneman', 3000, 2)];
    expect(ids([handEnd({ type: 'win', wins })])).toEqual(['callRonOther', 'winLimit']);
    const withMe = [win(3, 'none', 1000, ME), win(3, 'haneman', 3000, 2)];
    expect(ids([handEnd({ type: 'win', wins: withMe })])).toEqual(['callRon', 'winLimit']);
  });

  it('draws', () => {
    expect(ids([handEnd({ type: 'exhaustive', tenpai: [], hands: [], deltas: [] })])).toEqual(['drawExhaustive']);
    expect(ids([handEnd({ type: 'abortive', reason: 'fourWinds', seat: null, deltas: [] })])).toEqual([
      'drawAbortive',
    ]);
  });

  it('game end by own placement', () => {
    const final = (first: Seat) => ev({ type: 'gameEnd', final: [{ seat: first }, { seat: (first + 1) % 4 }] });
    expect(cuesFor([final(ME)], idle, initialCueState()).cues).toEqual([
      { id: 'gameEndFirst', delay: GAME_END_DELAY },
    ]);
    expect(ids([final(2)])).toEqual(['gameEnd']);
  });

  it('call window: only with own options, once per window', () => {
    const pass: Action = { type: 'pass', seat: ME };
    const pon: Action = { type: 'pon', seat: ME, tiles: [1, 2] };
    const window = (actions: Action[], seq = 5): CueView => ({
      seat: ME,
      seq,
      claimable: { seat: 3, tile: 1 },
      actions,
    });
    expect(ids([discard(3)], window([]))).toEqual(['tilePlace']);
    const first = cuesFor([discard(3)], window([pon, pass]), initialCueState());
    expect(first.cues.map((c) => c.id)).toEqual(['tilePlace', 'callAvailable']);
    expect(cuesFor([], window([pon, pass]), first.state).cues).toEqual([]);
    expect(ids([], window([pon, pass], 9), first.state)).toEqual(['callAvailable']);
  });

  it('whole bot games: every cue exists, every discard clicks, nothing throws', () => {
    const rng = seedRng('cues');
    const random = () => randomInt(rng, 1 << 30) / (1 << 30);
    for (let game = 0; game < 3; game++) {
      let g: GameState = createGame({ ...DEFAULT_RULES }, `cues-${game}`).state;
      let state = initialCueState();
      let discards = 0;
      let clicks = 0;
      for (let step = 0; step < 5000 && g.phase !== 'gameOver'; step++) {
        const seat = pendingSeats(g)[0] ?? 0;
        const action: Action =
          g.phase === 'playing' ? botAction(g, seat, { skill: 0.5, random })! : { type: 'nextHand' };
        const r = applyAction(g, action);
        g = r.state;
        const events = r.events.map((e) => redactEvent(e, ME));
        const out = cuesFor(events, viewFor(g, ME), state);
        state = out.state;
        discards += events.filter((e) => e.type === 'discard').length;
        clicks += out.cues.filter((c) => c.id === 'tilePlace').length;
        for (const c of out.cues) expect(c.id in SOUNDS).toBe(true);
      }
      expect(g.phase).toBe('gameOver');
      expect(clicks).toBe(discards);
    }
  });
});
