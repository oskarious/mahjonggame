// Replays Tenhou game logs through the engine with the TENHOU rules and reports every difference: illegal or missing
// actions, wrong draws, and hand results (yaku, han, fu, points, payments, tenpai, abortive draws, game end, final
// scores) that differ from Tenhou's. Pure (no I/O): tenhou.test.ts and scripts/tenhou-replay.ts do the file reading.
import {
  type Action,
  type GameState,
  type HandResult,
  type RuleSet,
  type Seat,
  type Tile,
  type YakuId,
  type YakumanId,
  TENHOU,
  actionKey,
  applyAction,
  createGame,
  isRedTile,
  kindOf,
  legalActions,
  pendingSeats,
  ronPoints,
  tsumoPoints,
} from '../../src/index.ts';
import { type WallLayout, withWall } from '../../src/fixed-wall.ts';
import type { TenhouAgari, TenhouGame, TenhouHand } from './mjlog.ts';

export interface HandReplay {
  /** Round, dealer and counters, e.g. "S3-1". */
  label: string;
  layout: WallLayout;
  /** Engine actions of the hand, the dealer's first draw being part of the deal. */
  actions: Action[];
  /** Differences from Tenhou; empty when the hand replays exactly. */
  mismatches: string[];
}

const ROUNDS = 'ESWN';
export const handLabel = (h: TenhouHand) => `${ROUNDS[h.round >> 2]}${(h.round & 3) + 1}-${h.honba}`;

const YAKU: Record<number, YakuId> = {
  0: 'menzenTsumo',
  1: 'riichi',
  2: 'ippatsu',
  3: 'chankan',
  4: 'rinshan',
  5: 'haitei',
  6: 'houtei',
  7: 'pinfu',
  8: 'tanyao',
  9: 'iipeikou',
  10: 'seatWind',
  11: 'seatWind',
  12: 'seatWind',
  13: 'seatWind',
  14: 'roundWind',
  15: 'roundWind',
  16: 'roundWind',
  17: 'roundWind',
  18: 'yakuhaiWhite',
  19: 'yakuhaiGreen',
  20: 'yakuhaiRed',
  21: 'doubleRiichi',
  22: 'chiitoitsu',
  23: 'chanta',
  24: 'ittsu',
  25: 'sanshokuDoujun',
  26: 'sanshokuDoukou',
  27: 'sankantsu',
  28: 'toitoi',
  29: 'sanankou',
  30: 'shousangen',
  31: 'honroutou',
  32: 'ryanpeikou',
  33: 'junchan',
  34: 'honitsu',
  35: 'chinitsu',
};
const DORA = 52;
const URA = 53;
const AKA = 54;

const YAKUMAN: Record<number, YakumanId> = {
  36: 'renhou',
  37: 'tenhou',
  38: 'chiihou',
  39: 'daisangen',
  40: 'suuankou',
  41: 'suuankou',
  42: 'tsuuiisou',
  43: 'ryuuiisou',
  44: 'chinroutou',
  45: 'chuuren',
  46: 'chuuren',
  47: 'kokushi',
  48: 'kokushi',
  49: 'daisuushii',
  50: 'shousuushii',
  51: 'suukantsu',
};

const LIMITS = ['none', 'mangan', 'haneman', 'baiman', 'sanbaiman', 'yakuman'];

const ABORTS: Record<string, string> = {
  yao9: 'nineTerminals',
  reach4: 'fourRiichi',
  ron3: 'tripleRon',
  kan4: 'fourKans',
  kaze4: 'fourWinds',
};

const sameList = (a: readonly unknown[], b: readonly unknown[]) => JSON.stringify(a) === JSON.stringify(b);

/** The hand's wall as far as the log shows it: draws, replacement draws, dora and ura indicators. */
export function wallOf(h: TenhouHand): WallLayout {
  const draws: Tile[] = [];
  const rinshan: Tile[] = [];
  const dora: Tile[] = [h.doraIndicator];
  let afterKan = false;
  for (const e of h.events) {
    if (e.type === 'call' && (e.meld.type === 'daiminkan' || e.meld.type === 'ankan' || e.meld.type === 'shouminkan')) {
      afterKan = true;
    } else if (e.type === 'draw') {
      (afterKan ? rinshan : draws).push(e.tile);
      afterKan = false;
    } else if (e.type === 'dora') {
      dora.push(e.tile);
    }
  }
  // Wins show every revealed indicator, including ones revealed by the winning discard.
  for (const a of h.agari) for (const t of a.doraIndicators) if (!dora.includes(t)) dora.push(t);
  const ura = h.agari.find((a) => a.uraIndicators.length)?.uraIndicators ?? [];
  return { hands: h.hands, draws, rinshan, dora, ura };
}

/** Replays a whole game; one entry per hand. Each hand starts from Tenhou's scores, so differences don't cascade. */
export function replayGame(game: TenhouGame, rules: RuleSet = TENHOU): HandReplay[] {
  if (!game.fourPlayers) throw new Error('Only four-player games are supported');
  const gameRules: RuleSet = {
    ...structuredClone(rules),
    length: game.hanchan ? 'south' : 'east',
    redFives: game.redFives ? { man: 1, pin: 1, sou: 1 } : { man: 0, pin: 0, sou: 0 },
    openTanyao: game.openTanyao,
  };
  const out: HandReplay[] = [];
  let prev: GameState | null = null;
  for (let i = 0; i < game.hands.length; i++) {
    const h = game.hands[i];
    const mismatches: string[] = [];
    const start = prev && prev.phase === 'handOver' ? applyAction(prev, { type: 'nextHand' }).state : null;
    if (prev && !start) mismatches.push('game ended before this hand');
    if (start) {
      const expected = { round: h.round, honba: h.honba, sticks: h.riichiSticks, scores: h.scores };
      const ours = {
        round: start.roundWind * 4 + start.dealer,
        honba: start.honba,
        sticks: start.riichiSticks,
        scores: start.scores,
      };
      if (JSON.stringify(ours) !== JSON.stringify(expected)) {
        mismatches.push(`hand start: ours ${JSON.stringify(ours)}, Tenhou ${JSON.stringify(expected)}`);
      }
    }
    const g = start ?? createGame(gameRules, 'tenhou').state;
    g.roundWind = h.round >> 2;
    g.dealer = h.dealer;
    g.honba = h.honba;
    g.riichiSticks = h.riichiSticks;
    g.scores = [...h.scores];
    const layout = wallOf(h);
    const replay: HandReplay = { label: handLabel(h), layout, actions: [], mismatches };
    out.push(replay);
    try {
      prev = replayHand(withWall(g, layout), h, replay);
      compareResult(prev, h, mismatches);
      if (prev.phase === 'gameOver' && i < game.hands.length - 1) mismatches.push('game ended early');
    } catch (e) {
      mismatches.push((e as Error).message);
      prev = null;
    }
    if (i === game.hands.length - 1 && prev && prev.phase !== 'gameOver') mismatches.push('game did not end');
  }
  return out;
}

class ReplayError extends Error {}

function replayHand(state: GameState, h: TenhouHand, replay: HandReplay): GameState {
  let g = state;
  const act = (a: Action) => {
    const legal = legalActions(g, 'seat' in a ? a.seat : 0);
    if (!legal.some((l) => actionKey(l) === actionKey(a))) {
      throw new ReplayError(
        `illegal ${actionKey(a)} at event; legal for seat: ${legal.map(actionKey).join(' ') || 'none'}`,
      );
    }
    g = applyAction(g, a).state;
    replay.actions.push(a);
  };
  /** Answers an open call window: the given actions, everyone else passes. */
  const resolve = (answers: Action[]) => {
    const step = g.hand.step;
    if (step.type !== 'calls' && step.type !== 'chankan') {
      if (answers.length) throw new ReplayError(`expected a call window for ${answers.map(actionKey).join(' ')}`);
      return;
    }
    for (const s of pendingSeats(g)) {
      act(answers.find((a) => 'seat' in a && a.seat === s) ?? { type: 'pass', seat: s });
    }
  };

  // The engine offers one chii/pon per shape (same kinds and red fives), Tenhou logs the exact copies. Identical
  // copies are interchangeable, so log tile ids are mapped to the engine's: `ids` maps log id → engine id.
  const ids = new Map<Tile, Tile>();
  const id = (t: Tile) => ids.get(t) ?? t;
  const shape = (tiles: Tile[]) =>
    tiles.map((t) => `${kindOf(t)}${isRedTile(t, g.rules.redFives) ? 'r' : ''}`).sort().join();
  const claim = (type: 'chii' | 'pon', seat: Seat, logTiles: Tile[]): Action => {
    const tiles = logTiles.map(id);
    const options = legalActions(g, seat).filter((a): a is Extract<Action, { type: 'chii' | 'pon' }> => a.type === type);
    const option = options.find((a) => sameList([...a.tiles].sort(), [...tiles].sort())) ??
      options.find((a) => shape(a.tiles) === shape(tiles));
    if (!option) return { type, seat, tiles };
    // Map the log's copies to the ones the engine melds, swapping ids with their twins still in the hand.
    for (const [i, t] of tiles.entries()) {
      const o = option.tiles.find((x) => kindOf(x) === kindOf(t) && !tiles.includes(x) && shape([x]) === shape([t]));
      if (o === undefined) continue;
      const other = [...ids].find(([, v]) => v === o)?.[0] ?? o;
      ids.set(logTiles[i], o);
      ids.set(other, t);
      tiles[i] = o;
    }
    return { type, seat, tiles };
  };

  let reach = -1;
  for (const e of h.events) {
    switch (e.type) {
      case 'draw': {
        resolve([]);
        const step = g.hand.step;
        const p = g.hand.players[e.seat];
        if (step.type !== 'turn' || step.seat !== e.seat || p.drawn !== e.tile) {
          throw new ReplayError(`draw ${e.seat}:${e.tile}: engine has ${JSON.stringify(step)} drawn ${p.drawn}`);
        }
        break;
      }
      case 'reach':
        if (e.step === 1) reach = e.seat;
        break;
      case 'discard':
        act({ type: 'discard', seat: e.seat, tile: id(e.tile), riichi: reach === e.seat || undefined });
        reach = -1;
        break;
      case 'call': {
        const m = e.meld;
        if (m.type === 'ankan' || m.type === 'shouminkan') {
          resolve([]);
          act({ type: 'kan', seat: e.seat, kind: m.kind });
        } else if (m.type === 'daiminkan') {
          resolve([{ type: 'daiminkan', seat: e.seat }]);
        } else {
          resolve([claim(m.type, e.seat, m.tiles.filter((t) => t !== m.called))]);
        }
        break;
      }
      case 'dora':
        break;
    }
  }

  const tsumo = h.agari.find((a) => a.who === a.fromWho);
  if (tsumo) {
    act({ type: 'tsumo', seat: tsumo.who });
  } else if (h.agari.length) {
    resolve(h.agari.map((a): Action => ({ type: 'ron', seat: a.who })));
  } else if (h.ryuukyoku?.reason === 'ron3') {
    // The three winners' hands are shown.
    resolve(h.ryuukyoku.tenpai.map((seat): Action => ({ type: 'ron', seat })));
  } else if (h.ryuukyoku?.reason === 'yao9') {
    const step = g.hand.step;
    act({ type: 'kyuushu', seat: step.type === 'turn' ? step.seat : -1 });
  } else {
    resolve([]);
  }
  if (g.phase === 'playing') {
    throw new ReplayError(`hand did not end; engine waits on ${JSON.stringify(g.hand.step).slice(0, 200)}`);
  }
  return g;
}

function compareResult(g: GameState, h: TenhouHand, out: string[]): void {
  const r = g.result!;
  const tenhouDeltas = h.agari.length
    ? h.agari.reduce((acc, a) => acc.map((x, s) => x + a.deltas[s]), [0, 0, 0, 0])
    : h.ryuukyoku!.deltas;
  if (!sameList(r.deltas, tenhouDeltas)) out.push(`deltas: ours ${r.deltas}, Tenhou ${tenhouDeltas}`);

  if (h.agari.length) {
    if (r.type !== 'win') {
      out.push(`result: ours ${r.type}${r.type === 'abortive' ? ` (${r.reason})` : ''}, Tenhou win`);
      return;
    }
    const seats = r.wins.map((w) => w.seat);
    const tenhouSeats = h.agari.map((a) => a.who);
    if (!sameList([...seats].sort(), [...tenhouSeats].sort())) out.push(`winners: ours ${seats}, Tenhou ${tenhouSeats}`);
    const indicators = g.hand.doraIndicators.slice(0, g.hand.doraRevealed);
    if (!sameList(indicators, h.agari[0].doraIndicators)) {
      out.push(`dora indicators: ours ${indicators}, Tenhou ${h.agari[0].doraIndicators}`);
    }
    for (const a of h.agari) {
      const w = r.wins.find((x) => x.seat === a.who);
      if (w) compareWin(g, w, a, out);
    }
  } else {
    const ry = h.ryuukyoku!;
    if (ry.reason === null || ry.reason === 'nm') {
      if (r.type !== 'exhaustive') {
        out.push(`result: ours ${r.type}${r.type === 'abortive' ? ` (${r.reason})` : ''}, Tenhou exhaustive draw`);
        return;
      }
      const tenpai = [0, 1, 2, 3].filter((s) => r.tenpai[s]);
      if (!sameList(tenpai, ry.tenpai)) out.push(`tenpai: ours ${tenpai}, Tenhou ${ry.tenpai}`);
      if ((ry.reason === 'nm') !== r.nagashi.length > 0) out.push(`nagashi: ours ${r.nagashi}, Tenhou ${ry.reason}`);
    } else if (r.type !== 'abortive' || r.reason !== ABORTS[ry.reason]) {
      out.push(`result: ours ${r.type}${r.type === 'abortive' ? ` (${r.reason})` : ''}, Tenhou ${ry.reason}`);
    }
  }

  const owari = h.owari;
  if (owari && g.phase !== 'gameOver') out.push('game should have ended');
  if (!owari && g.phase === 'gameOver') out.push('game ended, Tenhou continued');
  if (owari && g.final) {
    const points = [0, 1, 2, 3].map((s) => g.final!.find((f) => f.seat === s)!.points);
    const scores = [0, 1, 2, 3].map((s) => Math.round(g.final!.find((f) => f.seat === s)!.score * 10) / 10);
    if (!sameList(points, owari.points)) out.push(`final points: ours ${points}, Tenhou ${owari.points}`);
    if (!sameList(scores, owari.scores)) out.push(`final scores: ours ${scores}, Tenhou ${owari.scores}`);
  }
}

type Win = Extract<HandResult, { type: 'win' }>['wins'][number];

function compareWin(g: GameState, w: Win, a: TenhouAgari, out: string[]) {
  const v = w.value;
  const who = `seat ${a.who}`;
  if ((w.from ?? w.seat) !== a.fromWho) out.push(`${who} from: ours ${w.from}, Tenhou ${a.fromWho}`);
  const dealer = a.who === g.dealer;
  const t = tsumoPoints(v.basePoints, dealer);
  const points =
    w.from === null ? (dealer ? 3 * t.fromOthers : t.fromDealer + 2 * t.fromOthers) : ronPoints(v.basePoints, dealer);
  if (points !== a.points) out.push(`${who} points: ours ${points}, Tenhou ${a.points}`);
  if (v.limit !== LIMITS[a.limit]) out.push(`${who} limit: ours ${v.limit}, Tenhou ${LIMITS[a.limit]}`);

  if (a.yakuman.length) {
    const ours = v.yakuman.map((y) => y.id).sort();
    const theirs = a.yakuman.map((id) => YAKUMAN[id] ?? `#${id}`).sort();
    if (!sameList(ours, theirs)) out.push(`${who} yakuman: ours ${ours}, Tenhou ${theirs}`);
    return;
  }
  if (v.fu !== a.fu) out.push(`${who} fu: ours ${v.fu}, Tenhou ${a.fu}`);
  const han = (id: number) => a.yaku.filter(([y]) => y === id).reduce((s, [, n]) => s + n, 0);
  const counts = [
    ['dora', v.dora, han(DORA)],
    ['red', v.redDora, han(AKA)],
    ['ura', v.uraDora, han(URA)],
  ] as const;
  for (const [name, ours, theirs] of counts) {
    if (ours !== theirs) out.push(`${who} ${name}: ours ${ours}, Tenhou ${theirs}`);
  }
  const ours = v.yaku.map((y) => `${y.id}:${y.han}`).sort();
  const theirs = a.yaku
    .filter(([id]) => id !== DORA && id !== URA && id !== AKA)
    .map(([id, n]) => `${YAKU[id] ?? `#${id}`}:${n}`)
    .sort();
  if (!sameList(ours, theirs)) out.push(`${who} yaku: ours ${ours}, Tenhou ${theirs}`);
}
