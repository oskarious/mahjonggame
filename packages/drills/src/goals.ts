import {
  type GameState,
  type HandValue,
  type Kind,
  type YakuId,
  NUM_KINDS,
  analyzeDiscards,
  analyzeHand,
  EAST,
  GOOD_WAIT,
  countKinds,
  doraFromIndicator,
  goodWaitAcceptance,
  isDragon,
  isFuriten,
  isHonor,
  isSimple,
  isTerminal,
  isRedTile,
  isWind,
  kindOf,
  legalActions,
  limitFor,
  ronPoints,
  scoreHand,
  suitOf,
  tsumoPoints,
  unseenCounts,
  waits,
} from '@mahjong/engine';
import { LIMITS, YAKU } from './labels.ts';
import { LESSON_RULES, RED, buildPosition, declareWin, kindsOf, tilesOf, tok, winSpot } from './position.ts';
import { noChance, safetyGrades } from './safety.ts';
import type { CallChoice, Exercise, ExerciseOf, Position, TileGroup, Verdict } from './types.ts';

const ALL_KINDS = Array.from({ length: NUM_KINDS }, (_, k) => k);

// --- discard -------------------------------------------------------------------------------------------------

export function discardOptions(g: GameState) {
  const me = g.hand.players[0];
  return analyzeDiscards(
    me.hand,
    me.melds,
    unseenCounts(g, 0),
    me.discards.map((d) => kindOf(d.tile)),
  );
}

/** Tiles the position marks as discarded after the riichi (genbutsu too). */
export const passedOf = (p: Position | undefined): Kind[] => (p?.passed ? kindsOf(tilesOf(p.passed)) : []);

/** Live copies of the tiles that reach tenpai on a good wait, after discarding a tile of `kind` (1-shanten only). */
export function goodWaitTotal(g: GameState, kind: Kind): number {
  const me = g.hand.players[0];
  const i = me.hand.findIndex((t) => kindOf(t) === kind);
  const rest = [...me.hand.slice(0, i), ...me.hand.slice(i + 1)];
  return goodWaitAcceptance(rest, me.melds, unseenCounts(g, 0)).total;
}

/** Kinds seat 0 may discard that meet the goal (and the `only` restriction). */
export function discardAnswers(ex: ExerciseOf<'discard'>, g: GameState): Set<Kind> {
  const opts = discardOptions(g);
  let ok: Kind[];
  const goal = ex.goal;
  const best = Math.min(...opts.map((o) => o.shanten));
  const top = opts.filter((o) => o.shanten === best);
  if (goal === 'tenpai') ok = opts.filter((o) => o.tenpai).map((o) => o.kind);
  else if (goal === 'min-shanten') ok = top.map((o) => o.kind);
  else if (goal === 'max-ukeire') {
    const most = Math.max(...top.map((o) => o.total));
    ok = top.filter((o) => o.total === most).map((o) => o.kind);
  } else if (goal === 'max-good-wait') {
    const good = new Map(top.map((o) => [o.kind, goodWaitTotal(g, o.kind)]));
    const most = Math.max(...good.values());
    ok = top.filter((o) => good.get(o.kind) === most).map((o) => o.kind);
  } else if (goal === 'judgment') ok = opts.map((o) => o.kind);
  else if ('safest' in goal) {
    const grades = safetyGrades(g, goal.safest, passedOf(ex.position));
    const gradeOf = (k: Kind) => grades.get(k)!.grade;
    const safest = Math.min(...opts.map((o) => gradeOf(o.kind)));
    ok = opts.filter((o) => gradeOf(o.kind) === safest).map((o) => o.kind);
  } else {
    const safe = new Set(g.hand.players[goal.safeAgainst].discards.map((d) => kindOf(d.tile)));
    ok = opts.filter((o) => safe.has(o.kind)).map((o) => o.kind);
  }
  if (ex.only) {
    const only = new Set(kindsOf(tilesOf(ex.only)));
    ok = ok.filter((k) => only.has(k));
  }
  return new Set(ok);
}

// --- claims ---------------------------------------------------------------------------------------------------

/** Whether seat 0's tenpai wait can still come in at least `GOOD_WAIT` copies (two-sided or better). */
export function hasGoodWait(g: GameState): boolean {
  const me = g.hand.players[0];
  const held = countKinds(me.hand);
  return waits(me.hand, me.melds).reduce((n, k) => n + 4 - held[k], 0) >= GOOD_WAIT;
}

/**
 * The least seat 0 can win by ron, over all its winning tiles, without riichi, ura dora or other luck (0 when a
 * winning tile gives no yaku): the value a decision can count on.
 */
export function minRon(g: GameState): number {
  const me = g.hand.players[0];
  const h = g.hand;
  const dealer = g.dealer === 0;
  const values = waits(me.hand, me.melds).map((k) => {
    // A plain copy of the winning tile that is not in the hand (red fives would add dora by chance).
    const winTile = [3, 2, 1, 0].map((c) => k * 4 + c).find((t) => !me.hand.includes(t) && !isRedTile(t, RED))!;
    const v = scoreHand(
      {
        concealed: [...me.hand, winTile],
        melds: me.melds,
        winTile,
        tsumo: false,
        seatWind: EAST + ((4 - g.dealer) % 4),
        roundWind: EAST + g.roundWind,
        dealer,
        riichi: 'none',
        ippatsu: false,
        rinshan: false,
        chankan: false,
        haitei: false,
        houtei: false,
        tenhou: false,
        chiihou: false,
        renhou: false,
        doraIndicators: h.doraIndicators.slice(0, h.doraRevealed),
        uraIndicators: [],
      },
      LESSON_RULES,
    );
    return v ? ronPoints(v.basePoints, dealer) : 0;
  });
  return values.length ? Math.min(...values) : 0;
}

// --- pick ----------------------------------------------------------------------------------------------------

const GROUPS: Record<TileGroup, (k: Kind) => boolean> = {
  m: (k) => suitOf(k) === 0,
  p: (k) => suitOf(k) === 1,
  s: (k) => suitOf(k) === 2,
  winds: isWind,
  dragons: isDragon,
  honors: isHonor,
  terminals: isTerminal,
  simples: isSimple,
};

/** The kinds offered (in display order) and the right ones. */
export function pickQuiz(ex: ExerciseOf<'pick'>, g: GameState): { palette: Kind[]; answers: Set<Kind> } {
  const me = g.hand.players[0];
  const goal = ex.goal;
  const palette = ex.from
    ? kindsOf(tilesOf(ex.from))
    : typeof goal === 'object' || goal === 'no-chance'
      ? kindsOf(me.hand)
      : ALL_KINDS;
  let answers: Kind[];
  if (goal === 'waits') answers = waits(me.hand, me.melds);
  else if (goal === 'ukeire') {
    const a = analyzeHand(me.hand, me.melds, unseenCounts(g, 0));
    answers = (a.tenpai ? a.waits : a.ukeire).map((t) => t.kind);
  } else if (goal === 'no-chance') answers = noChance(g).filter((k) => palette.includes(k));
  else if (goal === 'dora') {
    const h = g.hand;
    answers = h.doraIndicators.slice(0, h.doraRevealed).map((t) => doraFromIndicator(kindOf(t)));
  } else answers = palette.filter(GROUPS[goal.group]);
  return { palette, answers: new Set(answers) };
}

// --- call ----------------------------------------------------------------------------------------------------

/** The responses seat 0 has in the position's call window. */
export function callChoices(g: GameState): Set<CallChoice> {
  return new Set(
    legalActions(g, 0).flatMap((a) =>
      a.type === 'ron' || a.type === 'pon' || a.type === 'chii' || a.type === 'daiminkan' || a.type === 'pass'
        ? [a.type]
        : [],
    ),
  );
}

// --- can-win -------------------------------------------------------------------------------------------------

export function verdict(g: GameState): Verdict {
  if (declareWin(g)) return 'yes';
  const w = winSpot(g);
  if (!waits(w.concealed, w.melds).includes(kindOf(w.tile))) return 'not-complete';
  if (w.by === 'ron' && isFuriten(g.hand.players[0])) return 'furiten';
  return 'no-yaku';
}

export const VERDICTS: { id: Verdict; label: string }[] = [
  { id: 'yes', label: 'Yes' },
  { id: 'no-yaku', label: 'No: no yaku' },
  { id: 'furiten', label: 'No: furiten' },
  { id: 'not-complete', label: 'No: not complete' },
];

// --- yaku, score, fu -----------------------------------------------------------------------------------------

/** The hand's value when seat 0 wins in this position; throws if it cannot. */
export function winValue(g: GameState): { value: HandValue; gain: number } {
  const v = declareWin(g);
  if (!v) throw new Error('Seat 0 cannot win in this position');
  return v;
}

const COMMON_YAKU: YakuId[] = [
  'riichi',
  'menzenTsumo',
  'tanyao',
  'pinfu',
  'yakuhaiWhite',
  'iipeikou',
  'toitoi',
  'honitsu',
  'chiitoitsu',
  'ittsu',
  'sanshokuDoujun',
  'chanta',
];

export function yakuQuiz(ex: ExerciseOf<'yaku'>, g: GameState): { options: YakuId[]; answers: Set<YakuId> } {
  const answers = new Set(winValue(g).value.yaku.map((y) => y.id));
  const pool = (ex.distractors ?? COMMON_YAKU).filter((id) => !answers.has(id));
  const options = [...answers, ...pool.slice(0, Math.max(2, 6 - answers.size))];
  // Stable, answer-independent order: the order of the yaku table.
  const order = Object.keys(YAKU);
  options.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return { options, answers };
}

export const yakuName = (id: YakuId) => YAKU[id];

function hanFuLabel(han: number, fu: number): string {
  const [limit] = limitFor(han, fu, LESSON_RULES);
  return limit === 'none' ? `${han} han ${fu} fu` : `${han} han ${fu} fu (${LIMITS[limit]})`;
}

function paymentLabel(base: number, dealer: boolean, tsumo: boolean): string {
  if (!tsumo) return `${ronPoints(base, dealer)}`;
  const t = tsumoPoints(base, dealer);
  return dealer ? `${t.fromOthers} all` : `${t.fromOthers} / ${t.fromDealer}`;
}

/**
 * Four options (ascending) and the index of the right one: the hand's han (alone or with its fu), its payment before counters, or
 * everything seat 0 collects (`gain`: payment, counters and riichi sticks on the table). Wrong options are near misses.
 */
export function scoreQuiz(ex: ExerciseOf<'score'>, g: GameState): { options: string[]; answer: number } {
  const { value, gain } = winValue(g);
  const dealer = g.dealer === 0;
  const tsumo = winSpot(g).by === 'tsumo';
  const { han, fu } = value;
  let right: string;
  let wrong: string[];
  if (ex.ask === 'han') {
    right = `${han} han`;
    wrong = [han - 1, han + 1, han + 2, han - 2].filter((h) => h >= 1).map((h) => `${h} han`);
  } else if (ex.ask === 'gain') {
    const counters = g.honba * LESSON_RULES.honbaValue;
    const sticks = g.riichiSticks * LESSON_RULES.riichiDeposit;
    right = String(gain);
    wrong = [gain - counters, gain - sticks, gain - counters - sticks, gain + counters, gain + 1000, gain - 1000].map(
      String,
    );
  } else {
    const near: [number, number][] = (
      [
        [han - 1, fu],
        [han + 1, fu],
        [han, fu + 10],
        [han, fu - 10],
        [han + 2, fu],
        [han - 1, fu + 10],
        [han + 1, fu + 20],
      ] as [number, number][]
    ).filter(([h, f]) => h >= 1 && f >= 20 && (f === 25 || f % 10 === 0));
    const base = ([h, f]: [number, number]) => limitFor(h, f, LESSON_RULES)[1];
    if (ex.ask === 'han-fu') {
      right = hanFuLabel(han, fu);
      wrong = near.map(([h, f]) => hanFuLabel(h, f));
    } else {
      right = paymentLabel(value.basePoints, dealer, tsumo);
      wrong = [
        paymentLabel(value.basePoints, !dealer, tsumo),
        paymentLabel(value.basePoints, dealer, !tsumo),
        ...near.map((c) => paymentLabel(base(c), dealer, tsumo)),
      ];
    }
  }
  const set = new Set<string>([right]);
  for (const w of wrong) if (set.size < 4) set.add(w);
  const options = [...set].sort((a, b) => parseInt(a) - parseInt(b) || a.localeCompare(b));
  return { options, answer: options.indexOf(right) };
}

export interface FuStep {
  /** `{9p}` tokens render as tiles. */
  label: string;
  options: number[];
  answer: number;
}

/** One step per fu part, then the rounded total. */
export function fuSteps(g: GameState): FuStep[] {
  const { value } = winValue(g);
  const steps: FuStep[] = value.fuParts.map((p) => {
    const choices: Record<string, [string, number[]]> = {
      base: ['Base fu', [20, 25, 30]],
      chiitoitsu: ['Seven pairs', [20, 25, 30]],
      closedRon: ['Closed hand, won by ron', [0, 10, 20]],
      tsumo: ['Won by self-draw', [0, 2, 10]],
      triplet: [
        `${p.open ? 'Open' : 'Concealed'} triplet${p.kind === undefined ? '' : ` ${tok(p.kind)}`}`,
        [2, 4, 8, 16],
      ],
      quad: [`${p.open ? 'Open' : 'Concealed'} quad${p.kind === undefined ? '' : ` ${tok(p.kind)}`}`, [8, 16, 32, 64]],
      valuePair: [`Pair${p.kind === undefined ? '' : ` ${tok(p.kind)}`}`, [0, 2, 4]],
      wait: ['The wait', [0, 2, 4]],
      openPinfu: ['Open hand with no other fu', [0, 2, 10]],
    };
    const [label, opts] = choices[p.reason];
    return {
      label,
      options: [...new Set([...opts, p.fu])].sort((a, b) => a - b),
      answer: p.fu,
    };
  });
  const fu = value.fu;
  steps.push({
    label: 'Total, rounded up to 10',
    options: [fu - 10, fu, fu + 10].filter((x) => x >= 20),
    answer: fu,
  });
  return steps;
}

// --- everything ----------------------------------------------------------------------------------------------

/** Builds the exercise's position (if any). */
export function stateOf(ex: Exercise): GameState | null {
  return ex.kind === 'choice' && !ex.position ? null : buildPosition(ex.position!);
}
