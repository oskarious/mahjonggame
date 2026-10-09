import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RULES,
  EMA_2025,
  type GameState,
  type HandResult,
  type MeldType,
  type RuleSet,
  applyAction,
  kindOf,
  kindToString,
  legalActions,
  makeRules,
  parseTiles,
  viewFor,
} from '../src/index.ts';
import {
  actionTypes,
  chii,
  daiminkan,
  discard,
  kan,
  kyuushu,
  lastResult,
  pass,
  play,
  pon,
  scenario,
  riichi,
  ron,
  tsumo,
} from './helpers.ts';

// Seat 0 is the dealer unless stated. Hands are 13 tiles; missing tiles are junk.

/** Closed pinfu tenpai: waits on 1s / 4s. */
const PINFU = '123m456p789s55m23s';
/** Closed tenpai on 1z / 2s (shanpon). */
const SHANPON = '123m456p789s11z22s';

const K = (s: string) => kindOf(parseTiles(s)[0]);
const noEma = makeRules(EMA_2025, {}); // EMA: no red fives, no abortive draws, no bankruptcy

function winOf(g: GameState) {
  const r = lastResult(g);
  if (r.type !== 'win') throw new Error(`Expected a win, got ${r.type}`);
  return r;
}
const yakuOf = (r: Extract<HandResult, { type: 'win' }>, i = 0) => r.wins[i].value.yaku.map((y) => y.id).sort();
const discardKinds = (g: GameState, seat: number, riichiOnly = false) =>
  legalActions(g, seat)
    .filter((a) => a.type === 'discard' && (!riichiOnly || a.riichi))
    .map((a) => (a.type === 'discard' ? kindToString(kindOf(a.tile)) : ''));

describe('payments', () => {
  it('ron: the discarder pays the hand + 300 per counter; the winner takes the riichi sticks', () => {
    const g = scenario({ hands: ['4s', PINFU], honba: 2, riichiSticks: 1 });
    const { state } = play(g, [discard(0, '4s'), ron(1)]);
    const r = winOf(state);
    expect(yakuOf(r)).toEqual(['pinfu']);
    expect(r.deltas).toEqual([-1600, 2600, 0, 0]);
    expect(state.riichiSticks).toBe(0);
    expect(state.next).toEqual({ renchan: false, honba: 0 });
  });

  it('dealer tsumo: everyone pays, +100 each per counter, dealer keeps the seat', () => {
    const g = scenario({ hands: [PINFU], draws: '4s', honba: 1 });
    const { state } = play(g, [tsumo(0)]);
    expect(winOf(state).deltas).toEqual([2400, -800, -800, -800]);
    expect(state.next).toEqual({ renchan: true, honba: 2 });
  });

  it('non-dealer tsumo: the dealer pays double', () => {
    const g = scenario({ hands: [undefined, PINFU], draws: '? 4s' });
    const { state } = play(g, [discard(0), tsumo(1)]);
    expect(winOf(state).deltas).toEqual([-700, 1500, -400, -400]);
  });
});

describe('calls', () => {
  it('chii only from the player on the left; pon from anyone; pon beats chii', () => {
    const g = scenario({ hands: ['3m', '45m', '33m'] });
    let { state } = play(g, [discard(0, '3m')], { settle: false });
    expect(actionTypes(state, 1).has('chii')).toBe(true);
    expect(actionTypes(state, 2).has('pon')).toBe(true);
    expect(actionTypes(state, 2).has('chii')).toBe(false);
    ({ state } = play(state, [chii(1, '45m'), pon(2)]));
    expect(state.hand.step).toEqual({ type: 'turn', seat: 2, afterCall: true, rinshan: false });
    expect(state.hand.players[2].melds[0].type).toBe('pon');
    expect(state.hand.players[1].melds).toEqual([]);
    expect(state.hand.players[0].discards[0].calledBy).toBe(2);
  });

  it('ron beats pon', () => {
    const g = scenario({ hands: ['4s', PINFU, '44s'] });
    const { state } = play(g, [discard(0, '4s'), pon(2), ron(1)]);
    expect(winOf(state).wins[0].seat).toBe(1);
    expect(state.hand.players[2].melds).toEqual([]);
  });

  it('after a call there is no draw, tsumo or quad, only a discard', () => {
    const g = scenario({ hands: ['3m', '45m'] });
    const { state } = play(g, [discard(0, '3m'), chii(1, '45m')]);
    expect(actionTypes(state, 1)).toEqual(new Set(['discard']));
    expect(state.hand.players[1].drawn).toBeNull();
  });

  it('swap-calling: after chii 3m with 4-5m, neither 3m nor 6m may be discarded', () => {
    const g = scenario({ hands: ['3m', '45m36m'] });
    const { state } = play(g, [discard(0, '3m'), chii(1, '45m')]);
    const kinds = discardKinds(state, 1);
    expect(state.hand.players[1].hand.map(kindOf)).toContain(K('6m'));
    expect(kinds).not.toContain('3m');
    expect(kinds).not.toContain('6m');
  });

  it('swap-calling: after pon the same tile may not be discarded', () => {
    const g = scenario({ hands: ['5p', '555p'] });
    const { state } = play(g, [discard(0, '5p'), pon(1)]);
    expect(discardKinds(state, 1)).not.toContain('5p');
  });

  it('a call that would leave only forbidden discards is not offered', () => {
    const g = scenario({
      hands: ['3m', '4536m'],
      melds: [[], [['pon', '111p'], ['pon', '999p'], ['pon', '111s']]],
    });
    const { state } = play(g, [discard(0, '3m')], { settle: false });
    expect(actionTypes(state, 1).has('chii')).toBe(false);
  });

  it('a player in riichi cannot call', () => {
    const g = scenario({ hands: ['5z', undefined, '55z'], riichi: [2] });
    const { state } = play(g, [discard(0, '5z')], { settle: false });
    expect(actionTypes(state, 2).has('pon')).toBe(false);
  });
});

describe('riichi', () => {
  it('needs a closed tenpai hand after the discard', () => {
    const g = scenario({ hands: [PINFU], draws: '1z' });
    expect(discardKinds(g, 0, true)).toEqual(['1z']);
    const open = scenario({ hands: ['456p789s55m23s'], melds: [[['chii', '123m']]], draws: '1z' });
    expect(discardKinds(open, 0, true)).toEqual([]);
  });

  it('needs 1000 points under the default rules, but not under EMA', () => {
    const scores = [900, 30000, 30000, 30000];
    expect(discardKinds(scenario({ hands: [PINFU], draws: '1z', scores }), 0, true)).toEqual([]);
    expect(discardKinds(scenario({ rules: noEma, hands: [PINFU], draws: '1z', scores }), 0, true)).toEqual(['1z']);
  });

  it('needs at least one tile left in the wall (EMA 3.3.10)', () => {
    expect(discardKinds(scenario({ hands: [PINFU], draws: '1z', wallSize: 1 }), 0, true)).toEqual([]);
    expect(discardKinds(scenario({ hands: [PINFU], draws: '1z', wallSize: 2 }), 0, true)).toEqual(['1z']);
  });

  it('the deposit is paid once the discard passes; afterwards only the drawn tile may be discarded', () => {
    const g = scenario({ hands: [PINFU], draws: '1z 9m 9m 9p 9p' });
    let { state } = play(g, [riichi(0, '1z')]);
    expect(state.scores[0]).toBe(29000);
    expect(state.riichiSticks).toBe(1);
    ({ state } = play(state, [discard(1), discard(2), discard(3)]));
    expect(legalActions(state, 0).filter((a) => a.type === 'discard')).toEqual([
      { type: 'discard', seat: 0, tile: state.hand.players[0].drawn },
    ]);
  });

  it('ron on the riichi declaration tile voids the riichi: no deposit is taken', () => {
    const g = scenario({ hands: [SHANPON, PINFU], draws: '4s' });
    const { state } = play(g, [riichi(0, '4s'), ron(1)]);
    expect(winOf(state).deltas).toEqual([-1000, 1000, 0, 0]);
    expect(state.scores[0]).toBe(29000);
    expect(state.riichiSticks).toBe(0);
  });

  it('a riichi tile claimed for a meld still counts: the deposit is paid', () => {
    const g = scenario({ hands: [PINFU, undefined, '11z'], draws: '1z' });
    const { state } = play(g, [riichi(0, '1z'), pon(2)]);
    expect(state.scores[0]).toBe(29000);
    expect(state.hand.players[0].riichi).toMatchObject({ accepted: true, ippatsu: false });
  });

  it('ippatsu: winning within one go-around', () => {
    const g = scenario({ hands: [SHANPON], draws: '4s 9m 9m 9p 2s' });
    const { state } = play(g, [riichi(0, '4s'), discard(1), discard(2), discard(3), tsumo(0)]);
    expect(yakuOf(winOf(state))).toEqual(['ippatsu', 'menzenTsumo', 'riichi']);
  });

  it('ippatsu is broken by any call', () => {
    const g = scenario({ hands: [SHANPON, '6z', '66z9p'], draws: '4s 9m 9p 2s' });
    const { state } = play(g, [riichi(0, '4s'), discard(1, '6z'), pon(2), discard(2, '9p'), discard(3), tsumo(0)]);
    expect(yakuOf(winOf(state))).toEqual(['menzenTsumo', 'riichi']);
  });

  it('double riichi on the first uninterrupted discard', () => {
    const first = play(scenario({ hands: [PINFU], draws: '1z', uninterrupted: true }), [riichi(0, '1z')]).state;
    expect(first.hand.players[0].riichi?.double).toBe(true);
    const later = play(scenario({ hands: [PINFU], draws: '1z' }), [riichi(0, '1z')]).state;
    expect(later.hand.players[0].riichi?.double).toBe(false);
  });

  describe('concealed quad after riichi (EMA 6.7.1)', () => {
    const kans = (hand: string, draw: string, inRiichi = true, rules = DEFAULT_RULES) =>
      legalActions(scenario({ rules, hands: [hand], draws: draw, riichi: inRiichi ? [0] : [] }), 0)
        .filter((a) => a.type === 'kan')
        .map((a) => (a.type === 'kan' ? kindToString(a.kind) : ''));

    it('example 1: only with the drawn tile', () => {
      expect(kans('33m67m234p3333s45s', '6s')).toEqual([]);
      expect(kans('33m67m234p3333s45s', '6s', false)).toEqual(['3s']);
    });
    it('example 2: not if it changes the waits', () => {
      expect(kans('234m222p3p234s789s', '2p')).toEqual([]);
    });
    it('example 3: not if the tiles could be part of a sequence; another triplet is fine', () => {
      expect(kans('666m8m999m567p111s', '6m')).toEqual([]);
      expect(kans('666m8m999m567p111s', '9m')).toEqual([]);
      expect(kans('666m8m999m567p111s', '1s')).toEqual(['1s']);
    });
    it('example 4: not with three consecutive triplets', () => {
      expect(kans('1234m444p555p666p', '4p')).toEqual([]);
    });
    it('allowed when the waits do not change', () => {
      expect(kans('123m456p789s111z2s', '1z')).toEqual(['1z']);
    });
    it('Tenhou: only the waits must stay the same', () => {
      const tenhou = makeRules(DEFAULT_RULES, { riichiAnkan: 'sameWaits' });
      expect(kans('1234m444p555p666p', '4p', true, tenhou)).toEqual(['4p']);
      // From a Tenhou log: waits 4m/5m either way.
      expect(kans('4666777888m345p', '8m')).toEqual([]);
      expect(kans('4666777888m345p', '8m', true, tenhou)).toEqual(['8m']);
      expect(kans('234m222p3p234s789s', '2p', true, tenhou)).toEqual([]);
    });
  });
});

describe('furiten', () => {
  it('discard furiten: no ron on any waiting tile, but tsumo is allowed', () => {
    const g = scenario({ hands: ['4s', PINFU], discards: [undefined, '1s'] });
    const { state } = play(g, [discard(0, '4s')], { settle: false });
    expect(state.result).toBeNull();
    expect(actionTypes(state, 1).has('ron')).toBe(false);

    const t = scenario({ hands: [undefined, PINFU], discards: [undefined, '1s'], draws: '? 4s' });
    expect(actionTypes(play(t, [discard(0)]).state, 1).has('tsumo')).toBe(true);
  });

  it('discards claimed by other players still count', () => {
    const g = scenario({ hands: ['4s', PINFU], discards: [undefined, '1s'] });
    g.hand.players[1].discards[0].calledBy = 2;
    expect(actionTypes(play(g, [discard(0, '4s')], { settle: false }).state, 1).has('ron')).toBe(false);
  });

  it('temporary furiten after passing a winning tile, until the next own draw', () => {
    const g = scenario({ hands: [undefined, PINFU, '4s1s', '1s'], draws: '9m 9p 7z 7z 9m 9p 8m' });
    let { state } = play(g, [discard(0), discard(1), discard(2, '4s')], { settle: false });
    expect(actionTypes(state, 1).has('ron')).toBe(true);
    ({ state } = play(state, [pass(1), discard(3, '1s')], { settle: false }));
    expect(state.hand.players[1].tempFuriten).toBe(true);
    expect(actionTypes(state, 1).has('ron')).toBe(false);
    ({ state } = play(state, [discard(0), discard(1), discard(2, '1s')], { settle: false }));
    expect(actionTypes(state, 1).has('ron')).toBe(true);
  });

  it('after riichi, a missed winning tile means furiten for the rest of the hand', () => {
    const g = scenario({ hands: [undefined, PINFU, '4s', '1s'], riichi: [1], draws: '9m 9p 7z 7z 9m 9p 8m 8m' });
    let { state } = play(g, [discard(0), discard(1), discard(2, '4s'), pass(1)]);
    expect(state.hand.players[1].riichiFuriten).toBe(true);
    ({ state } = play(state, [discard(3), discard(0), discard(1), discard(2), discard(3, '1s')], { settle: false }));
    expect(actionTypes(state, 1).has('ron')).toBe(false);
  });
});

describe('quads', () => {
  it('robbing an extended quad (chankan): the quad is not completed', () => {
    const g = scenario({
      rules: noEma,
      hands: [undefined, undefined, '123p456p789s11z46m'],
      melds: [[], [['pon', '555m']]],
      draws: '? 5m',
    });
    let { state } = play(g, [discard(0), kan(1, '5m')], { settle: false });
    expect(state.hand.step.type).toBe('chankan');
    ({ state } = play(state, [ron(2)]));
    const r = winOf(state);
    expect(yakuOf(r)).toEqual(['chankan']);
    expect(r.wins[0].from).toBe(1);
    expect(r.deltas[1]).toBe(-1300);
    expect(state.hand.doraRevealed).toBe(1);
  });

  it('declining to rob completes the quad and makes the player furiten', () => {
    const g = scenario({
      rules: noEma,
      hands: [undefined, undefined, '123p456p789s11z46m'],
      melds: [[], [['pon', '555m']]],
      draws: '? 5m',
    });
    const { state } = play(g, [discard(0), kan(1, '5m'), pass(2)], { settle: false });
    expect(state.hand.players[1].melds[0].type).toBe('shouminkan');
    expect(state.hand.doraRevealed).toBe(2);
    expect(state.hand.players[2].tempFuriten).toBe(true);
    expect(state.hand.step).toMatchObject({ type: 'turn', seat: 1, rinshan: true });
  });

  it('only thirteen orphans may rob a concealed quad', () => {
    const g = scenario({
      rules: noEma,
      hands: [undefined, '111m', '9m19p19s12345677z', '23m456p789s123s55p'],
      draws: '? 1m',
    });
    let { state } = play(g, [discard(0), kan(1, '1m')], { settle: false });
    expect(actionTypes(state, 2).has('ron')).toBe(true);
    expect(legalActions(state, 3)).toEqual([]);
    ({ state } = play(state, [ron(2)]));
    expect(winOf(state).wins[0].value.yakuman.map((y) => y.id)).toEqual(['kokushi']);
  });

  it('robbing a concealed quad with thirteen orphans can be disabled', () => {
    const g = scenario({
      rules: makeRules(EMA_2025, { kokushiRobsConcealedKan: false }),
      hands: [undefined, '111m', '9m19p19s12345677z'],
      draws: '? 1m',
    });
    const { state } = play(g, [discard(0), kan(1, '1m')], { settle: false });
    expect(state.hand.step).toMatchObject({ type: 'turn', seat: 1, rinshan: true });
    expect(state.hand.players[1].melds[0].type).toBe('ankan');
  });

  it('winning on the replacement tile (rinshan kaihou), with a new dora indicator', () => {
    const g = scenario({ hands: ['9999m123m456p78s5p'], draws: '5p', rinshan: '9s' });
    const wallBefore = g.hand.wall.length;
    let { state } = play(g, [kan(0, '9m')]);
    expect(state.hand.doraRevealed).toBe(2);
    expect(state.hand.wall.length).toBe(wallBefore - 1);
    ({ state } = play(state, [tsumo(0)]));
    expect(yakuOf(winOf(state))).toEqual(['menzenTsumo', 'rinshan']);
  });

  it('no quad after the last tile has been drawn', () => {
    expect(actionTypes(scenario({ hands: ['1111z'] }), 0).has('kan')).toBe(true);
    expect(actionTypes(scenario({ hands: ['1111z'], wallSize: 1 }), 0).has('kan')).toBe(false);
  });

  it('no fifth quad', () => {
    const g = scenario({
      hands: ['1111z'],
      melds: [[['ankan', '9999m']], [['ankan', '1111p'], ['ankan', '9999p'], ['ankan', '1111s']]],
    });
    expect(actionTypes(g, 0).has('kan')).toBe(false);
  });
});

describe('last tile', () => {
  it('haitei: self-draw on the last tile', () => {
    const g = scenario({ hands: [undefined, PINFU], draws: '? 4s', wallSize: 2 });
    const { state } = play(g, [discard(0), tsumo(1)]);
    expect(yakuOf(winOf(state))).toEqual(['haitei', 'menzenTsumo', 'pinfu']);
  });

  it('the last discard can only be claimed for a win (houtei)', () => {
    const g = scenario({ hands: [undefined, '4s', PINFU, '44s'], draws: '? ?', wallSize: 2 });
    let { state } = play(g, [discard(0), discard(1, '4s')], { settle: false });
    expect(actionTypes(state, 3).has('pon')).toBe(false);
    expect(actionTypes(state, 2).has('ron')).toBe(true);
    ({ state } = play(state, [ron(2)]));
    expect(yakuOf(winOf(state))).toEqual(['houtei', 'pinfu']);
  });

  it('exhaustive draw: noten players pay the tenpai players', () => {
    const one = play(scenario({ hands: [undefined, PINFU], wallSize: 1 }), [discard(0)]).state;
    expect(lastResult(one)).toMatchObject({ type: 'exhaustive', tenpai: [false, true, false, false] });
    expect(lastResult(one).deltas).toEqual([-1000, 3000, -1000, -1000]);
    expect(one.next).toEqual({ renchan: false, honba: 1 });

    const two = play(scenario({ hands: [SHANPON, undefined, PINFU], wallSize: 1 }), [discard(0)]).state;
    expect(lastResult(two).deltas).toEqual([1500, -1500, 1500, -1500]);
    expect(two.next).toEqual({ renchan: true, honba: 1 });

    const three = play(scenario({ hands: [SHANPON, undefined, PINFU, '123p456s789m55z66z'], wallSize: 1 }), [discard(0)])
      .state;
    expect(lastResult(three).deltas).toEqual([1000, -3000, 1000, 1000]);

    const none = play(scenario({ wallSize: 1, riichiSticks: 2 }), [discard(0)]).state;
    expect(lastResult(none).deltas).toEqual([0, 0, 0, 0]);
    expect(none.riichiSticks).toBe(2);
  });
});

describe('liability (pao)', () => {
  const setup = (hands: (string | undefined)[], draws: string) =>
    scenario({ rules: noEma, hands, melds: [[], [['pon', '555z'], ['pon', '666z']]], draws });

  it('feeding the third dragon triplet: the feeder pays a self-drawn big three dragons alone', () => {
    const g = setup(['7z', '77z123m4p5p'], '? ? ? ? 4p');
    let { state } = play(g, [discard(0, '7z'), pon(1), discard(1, '5p')]);
    expect(state.hand.players[1].pao.daisangen).toBe(0);
    ({ state } = play(state, [discard(2), discard(3), discard(0), tsumo(1)]));
    expect(winOf(state).deltas).toEqual([-32000, 32000, 0, 0]);
  });

  it('by ron from another player, the feeder and discarder split it', () => {
    const g = setup(['7z', '77z123m4p5p', '4p'], '? ?');
    const { state } = play(g, [discard(0, '7z'), pon(1), discard(1, '5p'), discard(2, '4p'), ron(1)]);
    expect(winOf(state).deltas).toEqual([-16000, 32000, -16000, 0]);
  });

  it('if the feeder also deals in, they pay it all', () => {
    const g = setup(['7z4p', '77z123m4p5p'], '? ? ? ?');
    const { state } = play(g, [
      discard(0, '7z'),
      pon(1),
      discard(1, '5p'),
      discard(2),
      discard(3),
      discard(0, '4p'),
      ron(1),
    ]);
    expect(winOf(state).deltas).toEqual([-32000, 32000, 0, 0]);
  });
});

describe('multiple winners', () => {
  const hands = ['4s', PINFU, '123m456p789s99m23s'];
  const opts = { riichi: [2], riichiSticks: 2, honba: 1 };

  it('double ron (EMA): both get counters; riichi winners get their own stick back, the rest goes to the first winner', () => {
    const { state } = play(scenario({ hands, ...opts }), [discard(0, '4s'), ron(1), ron(2)]);
    const r = winOf(state);
    expect(r.wins.map((w) => w.seat)).toEqual([1, 2]);
    expect(r.deltas).toEqual([-3600, 3300, 3300, 0]);
    expect(state.riichiSticks).toBe(0);
  });

  it('head bump: only the first player after the discarder wins and takes every stick', () => {
    const rules = makeRules(DEFAULT_RULES, { multipleRon: false });
    const { state } = play(scenario({ rules, hands, ...opts }), [discard(0, '4s'), ron(1), ron(2)]);
    expect(winOf(state).deltas).toEqual([-1300, 4300, 0, 0]);
  });

  it('triple ron is an abortive draw under the default rules, three winners under EMA', () => {
    const all = [...hands, '123m456p789s77p23s'];
    const steps = [discard(0, '4s'), ron(1), ron(2), ron(3)];
    const aborted = play(scenario({ hands: all, ...opts }), steps).state;
    expect(lastResult(aborted)).toMatchObject({ type: 'abortive', reason: 'tripleRon', deltas: [0, 0, 0, 0] });
    expect(aborted.riichiSticks).toBe(3);
    expect(aborted.next).toEqual({ renchan: true, honba: 2 });

    const ema = play(scenario({ rules: noEma, hands: all, ...opts }), steps).state;
    expect(winOf(ema).wins).toHaveLength(3);
  });
});

describe('abortive draws', () => {
  it('nine terminals and honours on the first uninterrupted turn', () => {
    const g = scenario({ hands: ['19m19p19s123z'], uninterrupted: true });
    expect(actionTypes(g, 0).has('kyuushu')).toBe(true);
    const { state } = play(g, [kyuushu(0)]);
    expect(lastResult(state)).toMatchObject({ type: 'abortive', reason: 'nineTerminals' });
    expect(state.next).toEqual({ renchan: true, honba: 1 });

    expect(actionTypes(scenario({ hands: ['19m19p19s123z'] }), 0).has('kyuushu')).toBe(false);
    expect(actionTypes(scenario({ rules: noEma, hands: ['19m19p19s123z'], uninterrupted: true }), 0).has('kyuushu')).toBe(false);
  });

  it('four identical winds as the first discards', () => {
    const steps = [discard(0, '1z'), discard(1, '1z'), discard(2, '1z'), discard(3, '1z')];
    const g = scenario({ hands: ['1z', '1z', '1z', '1z'], uninterrupted: true });
    expect(lastResult(play(g, steps).state)).toMatchObject({ type: 'abortive', reason: 'fourWinds' });
    const ema = scenario({ rules: noEma, hands: ['1z', '1z', '1z', '1z'], uninterrupted: true });
    expect(play(ema, steps).state.result).toBeNull();
  });

  it('four riichi', () => {
    const g = scenario({ hands: [undefined, undefined, undefined, PINFU], riichi: [0, 1, 2], turn: 3, draws: '1z' });
    const { state } = play(g, [riichi(3, '1z')]);
    expect(lastResult(state)).toMatchObject({ type: 'abortive', reason: 'fourRiichi' });
    expect(state.riichiSticks).toBe(4);
  });

  it('four quads by different players abort after the next discard; by one player play continues', () => {
    const split = scenario({
      hands: ['2222z'],
      melds: [[], [['ankan', '1111p'], ['ankan', '9999p'], ['ankan', '1111s']]],
    });
    expect(lastResult(play(split, [kan(0, '2z'), discard(0)]).state)).toMatchObject({
      type: 'abortive',
      reason: 'fourKans',
    });

    const single = scenario({
      hands: ['2222z'],
      melds: [[['ankan', '1111p'], ['ankan', '9999p'], ['ankan', '1111s']]],
    });
    const { state } = play(single, [kan(0, '2z'), discard(0)]);
    expect(state.result).toBeNull();
    expect(state.hand.step).toMatchObject({ type: 'turn', seat: 1 });
  });
});

describe('first-turn yakuman', () => {
  it('tenhou: the dealer wins with the starting hand', () => {
    const { state } = play(scenario({ hands: [PINFU], draws: '4s', uninterrupted: true }), [tsumo(0)]);
    const r = winOf(state);
    expect(r.wins[0].value.yakuman.map((y) => y.id)).toEqual(['tenhou']);
    expect(r.deltas).toEqual([48000, -16000, -16000, -16000]);
  });

  it('chiihou: a non-dealer wins on their first draw', () => {
    const g = scenario({ hands: [undefined, PINFU], draws: '? 4s', uninterrupted: true });
    const { state } = play(g, [discard(0), tsumo(1)]);
    expect(winOf(state).wins[0].value.yakuman.map((y) => y.id)).toEqual(['chiihou']);
    expect(winOf(state).deltas).toEqual([-16000, 32000, -8000, -8000]);
  });

  it('renhou: ron before the first draw is a mangan (EMA)', () => {
    const g = scenario({ hands: ['4s', PINFU], uninterrupted: true });
    const { state } = play(g, [discard(0, '4s'), ron(1)]);
    expect(yakuOf(winOf(state))).toEqual(['renhou']);
    expect(winOf(state).deltas).toEqual([-8000, 8000, 0, 0]);
  });

  it('a call interrupts the first go-around', () => {
    const g = scenario({ hands: ['5z', PINFU, '55z'], draws: '? ? ? 4s', uninterrupted: true });
    const { state } = play(g, [discard(0, '5z'), pon(2), discard(2), discard(3), discard(0), tsumo(1)]);
    expect(winOf(state).wins[0].value.yakuman).toEqual([]);
    expect(yakuOf(winOf(state))).toEqual(['menzenTsumo', 'pinfu']);
  });
});

describe('end of game', () => {
  const allLast = (o: Parameters<typeof scenario>[0] = {}) =>
    play(scenario({ dealer: 3, wallSize: 1, ...o }), [discard(3)]).state;

  it('east-only: ends when the last dealer does not keep the seat', () => {
    const g = allLast();
    expect(g.phase).toBe('gameOver');
    expect(g.final).toHaveLength(4);
  });

  it('all-last: a tenpai dealer keeps playing', () => {
    expect(allLast({ hands: [undefined, undefined, undefined, SHANPON] }).phase).toBe('handOver');
  });

  it('east + south (EMA): the south round follows the east round', () => {
    const g = allLast({ rules: noEma });
    expect(g.phase).toBe('handOver');
    const next = applyAction(g, { type: 'nextHand' }).state;
    expect([next.roundWind, next.dealer]).toEqual([1, 0]);
  });

  it('bankruptcy ends the game below zero (default), not at exactly zero, and never under EMA', () => {
    const hands = [undefined, PINFU];
    const below = play(scenario({ hands, wallSize: 1, scores: [30000, 30000, 59500, 500] }), [discard(0)]).state;
    expect(below.phase).toBe('gameOver');
    const zero = play(scenario({ hands, wallSize: 1, scores: [30000, 30000, 59000, 1000] }), [discard(0)]).state;
    expect(zero.phase).toBe('handOver');
    const ema = play(scenario({ rules: noEma, hands, wallSize: 1, scores: [30000, 30000, 59500, 500] }), [discard(0)]).state;
    expect(ema.phase).toBe('handOver');
  });

  it('final score = (points - 30000 + uma) / 1000; ties split the uma (EMA 3.7.1)', () => {
    const g = allLast({ scores: [40000, 30000, 30000, 20000] });
    expect(g.final!.map((f) => [f.seat, f.rank, f.uma, f.score])).toEqual([
      [0, 1, 15000, 25],
      [1, 2, 0, 0],
      [2, 2, 0, 0],
      [3, 4, -15000, -25],
    ]);
  });

  it('ties can instead go to the seat closest to the first dealer', () => {
    const g = allLast({ rules: makeRules(DEFAULT_RULES, { tieBreak: 'seatOrder' }), scores: [40000, 30000, 30000, 20000] });
    expect(g.final!.map((f) => [f.seat, f.rank, f.score])).toEqual([
      [0, 1, 25],
      [1, 2, 5],
      [2, 3, -5],
      [3, 4, -25],
    ]);
  });

  it('leftover riichi sticks go to the leader, split between tied leaders', () => {
    expect(allLast({ scores: [39000, 30000, 30000, 20000], riichiSticks: 1 }).final![0].points).toBe(40000);
    const tied = allLast({ scores: [35000, 35000, 29000, 20000], riichiSticks: 1 });
    expect(tied.final!.slice(0, 2).map((f) => f.points)).toEqual([35500, 35500]);
  });
});

describe('last discard', () => {
  const last = (g: GameState) => g.hand.lastDiscard && { seat: g.hand.lastDiscard.seat, kind: kindToString(kindOf(g.hand.lastDiscard.tile)) };

  it('stays through the next draw and moves on the next discard', () => {
    const g = scenario({ hands: ['1z', undefined, undefined], draws: '? 9s' });
    expect(g.hand.lastDiscard).toBeNull();
    let { state } = play(g, [discard(0, '1z')]);
    expect(state.hand.step).toMatchObject({ type: 'turn', seat: 1 });
    expect(last(state)).toEqual({ seat: 0, kind: '1z' });
    expect(viewFor(state, 2).lastDiscard).toEqual(state.hand.lastDiscard);
    ({ state } = play(state, [discard(1)]));
    expect(last(state)).toEqual({ seat: 1, kind: '9s' });
  });

  it('stays through a closed quad until the quad player discards', () => {
    const g = scenario({ rules: noEma, hands: ['1z', '777p'], draws: '? 7p' });
    let { state } = play(g, [discard(0, '1z'), kan(1, '7p')]);
    expect(state.hand.players[1].melds[0].type).toBe('ankan');
    expect(last(state)).toEqual({ seat: 0, kind: '1z' });
    ({ state } = play(state, [discard(1)]));
    expect(last(state)?.seat).toBe(1);
  });

  it('is cleared when the discard is claimed', () => {
    const g = scenario({ hands: ['3m', '45m', '33m'] });
    const { state } = play(g, [discard(0, '3m'), pon(2)]);
    expect(state.hand.lastDiscard).toBeNull();
    expect(viewFor(state, 0).lastDiscard).toBeNull();
  });
});

describe('Tenhou rule flags', () => {
  const rules = (o: Partial<RuleSet>) => makeRules(DEFAULT_RULES, o);
  const afterDiscard = rules({ openKanDora: 'afterDiscard' });

  it('open quad dora after the discard: not counted for a win on the replacement tile', () => {
    const g = scenario({ rules: afterDiscard, hands: ['9m', '999m123m456p78s55p'], rinshan: '9s' });
    let { state } = play(g, [discard(0, '9m'), daiminkan(1)], { settle: false });
    // Called 9m from the dealer, drew the replacement 9s: complete, with the new indicator still face down.
    ({ state } = play(state, []));
    expect(state.hand.doraRevealed).toBe(1);
    expect(state.hand.pendingDora).toBe(1);
    const won = play(state, [tsumo(1)]).state;
    expect(winOf(won).wins[0].value.dora).toBe(0);

    ({ state } = play(state, [discard(1, '5p')], { settle: false }));
    expect(state.hand.doraRevealed).toBe(2);
    expect(state.hand.pendingDora).toBe(0);
  });

  it('open quad dora after the discard: revealed before a second quad; concealed quads at once', () => {
    const g = scenario({
      rules: afterDiscard,
      hands: ['1111z5m'],
      melds: [[['pon', '999m']]],
      draws: '9m',
      rinshan: '5p',
    });
    let { state } = play(g, [kan(0, '9m')]);
    expect([state.hand.doraRevealed, state.hand.pendingDora]).toEqual([1, 1]);
    ({ state } = play(state, [kan(0, '1z')]));
    expect([state.hand.doraRevealed, state.hand.pendingDora]).toEqual([3, 0]);

    const ema = play(scenario({ hands: ['5m'], melds: [[['pon', '999m']]], draws: '9m' }), [kan(0, '9m')]).state;
    expect([ema.hand.doraRevealed, ema.hand.pendingDora]).toEqual([2, 0]);
  });

  it('double ron with counters and deposits to the first winner only', () => {
    const hands = ['4s', PINFU, '123m456p789s99m23s'];
    const tenhou = rules({ honbaToAllRonWinners: false, depositsToFirstRonWinner: true });
    const g = scenario({ rules: tenhou, hands, riichi: [2], riichiSticks: 2, honba: 1 });
    const { state } = play(g, [discard(0, '4s'), ron(1), ron(2)]);
    expect(winOf(state).deltas).toEqual([-3300, 4300, 2000, 0]);
  });

  it('a single wait on the fourth copy next to an own pon: noten (EMA reading), tenpai under Tenhou', () => {
    const o = { hands: [undefined, '567m111s234p6s'], melds: [[], [['pon', '666s']]] as [MeldType, string][][], wallSize: 1 };
    const ema = play(scenario(o), [discard(0)]).state;
    expect(lastResult(ema)).toMatchObject({ tenpai: [false, false, false, false] });
    const tenhou = play(scenario({ ...o, rules: rules({ deadWaitCopies: 'concealed' }) }), [discard(0)]).state;
    expect(lastResult(tenhou)).toMatchObject({ tenpai: [false, true, false, false], deltas: [-1000, 3000, -1000, -1000] });
  });

  describe('nagashi mangan', () => {
    const terminals = { discards: ['5m', '19m19p1z', '2p', '3s'], wallSize: 1, draws: '5s' };

    it('pays a mangan by self-draw instead of the noten payments', () => {
      const g = scenario({ rules: rules({ nagashiMangan: true }), hands: [PINFU], ...terminals });
      const state = play(g, [discard(0)]).state;
      expect(lastResult(state)).toMatchObject({ type: 'exhaustive', nagashi: [1], tenpai: [true, false, false, false] });
      expect(lastResult(state).deltas).toEqual([-4000, 8000, -2000, -2000]);
      expect(state.next).toEqual({ renchan: true, honba: 1 });
    });

    it('not if a discard was claimed, and not under EMA', () => {
      const g = scenario({ rules: rules({ nagashiMangan: true }), ...terminals });
      g.hand.players[1].discards[2].calledBy = 2;
      expect(lastResult(play(g, [discard(0)]).state)).toMatchObject({ nagashi: [], deltas: [0, 0, 0, 0] });
      const ema = scenario({ ...terminals });
      expect(lastResult(play(ema, [discard(0)]).state)).toMatchObject({ nagashi: [], deltas: [0, 0, 0, 0] });
    });
  });

  describe('end of game', () => {
    const allLast = (r: RuleSet, o: Parameters<typeof scenario>[0] = {}) =>
      play(scenario({ rules: r, dealer: 3, wallSize: 1, ...o }), [discard(3)]).state;
    const stops = rules({ dealerStopsAllLast: true, tieBreak: 'seatOrder' });
    const tenpaiDealer = [undefined, undefined, undefined, SHANPON];

    it('a tenpai dealer in the last hand stops when leading with the return points', () => {
      expect(allLast(stops, { hands: tenpaiDealer, scores: [20000, 25000, 25000, 30000] }).phase).toBe('gameOver');
      expect(allLast(stops, { hands: tenpaiDealer, scores: [30000, 25000, 25000, 20000] }).phase).toBe('handOver');
      expect(allLast(stops, { hands: tenpaiDealer, scores: [25000, 25000, 25000, 25000] }).phase).toBe('handOver');
      // Ties: the dealer of the last hand ranks below the other seats.
      expect(allLast(stops, { hands: tenpaiDealer, scores: [11000, 31000, 30000, 27000] }).phase).toBe('handOver');
      expect(allLast(DEFAULT_RULES, { hands: tenpaiDealer, scores: [20000, 25000, 25000, 30000] }).phase).toBe(
        'handOver',
      );
    });

    it('not after an abortive draw', () => {
      const g = scenario({
        rules: stops,
        dealer: 3,
        hands: [undefined, undefined, undefined, '19m19p19s1234567z'],
        uninterrupted: true,
        scores: [20000, 25000, 25000, 30000],
      });
      const state = play(g, [kyuushu(3)]).state;
      expect(lastResult(state)).toMatchObject({ type: 'abortive', reason: 'nineTerminals' });
      expect(state.phase).toBe('handOver');
    });

    it('sudden death: below the return points the next round is played until someone reaches them', () => {
      const sd = rules({ suddenDeath: true });
      const even = allLast(sd, { scores: [25000, 25000, 25000, 25000] });
      expect(even.phase).toBe('handOver');
      const south = applyAction(even, { type: 'nextHand' }).state;
      expect([south.roundWind, south.dealer]).toEqual([1, 0]);

      const reached = { scores: [24000, 30000, 25000, 21000], roundWind: 1, dealer: 0, wallSize: 1 };
      expect(play(scenario({ rules: sd, ...reached }), [discard(0)]).state.phase).toBe('gameOver');
      const below = { ...reached, scores: [24000, 29000, 26000, 21000] };
      expect(play(scenario({ rules: sd, ...below }), [discard(0)]).state.phase).toBe('handOver');
      // The extra round is the last.
      expect(allLast(sd, { roundWind: 1, scores: [25000, 25000, 25000, 25000] }).phase).toBe('gameOver');
      expect(allLast(sd, { scores: [24000, 30000, 25000, 21000] }).phase).toBe('gameOver');
      // A dealer who keeps the seat plays on, as in the last hand.
      const renchan = { ...reached, hands: [SHANPON] };
      expect(play(scenario({ rules: sd, ...renchan }), [discard(0)]).state.phase).toBe('handOver');
    });

    it('leftover deposits go to the first in seat order when ties rank by seat', () => {
      const g = allLast(rules({ tieBreak: 'seatOrder' }), { scores: [35000, 35000, 29000, 20000], riichiSticks: 1 });
      expect(g.final!.slice(0, 2).map((f) => [f.seat, f.points])).toEqual([
        [0, 36000],
        [1, 35000],
      ]);
    });
  });
});
