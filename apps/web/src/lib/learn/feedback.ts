// What the reader is told after an answer. Pure; built from engine results so it cannot contradict the position.
// Texts may contain `{1m}`-style tile tokens.
import { type GameState, type Kind, kindOf, waits } from '@mahjong/engine';
import { discardAnswers, discardOptions, goodWaitTotal, passedOf } from '@mahjong/drills/goals';
import { REASON_TEXT, safetyGrades } from '@mahjong/drills/safety';
import { tok, winSpot } from '@mahjong/drills/position';
import type { ExerciseOf, Verdict } from '@mahjong/drills/types';

const toks = (ks: Iterable<Kind>) => [...ks].map(tok).join(' ');
const away = (shanten: number) => (shanten === 0 ? 'tenpai' : `${shanten} away from tenpai`);

export function discardFeedback(ex: ExerciseOf<'discard'>, g: GameState, kind: Kind, correct: boolean): string {
  const opts = discardOptions(g);
  const o = opts.find((x) => x.kind === kind)!;
  const goal = ex.goal;
  /** One right answer, to compare a wrong one with. */
  const right = () => [...discardAnswers(ex, g)][0];
  if (typeof goal === 'object' && 'safest' in goal) {
    const grades = safetyGrades(g, goal.safest, passedOf(ex.position));
    const why = (k: Kind) => `${tok(k)}: ${REASON_TEXT[grades.get(k)!.reason]}.`;
    return correct ? why(kind) : `${why(kind)} You hold a safer tile.`;
  }
  if (typeof goal === 'object') {
    const safe = g.hand.players[goal.safeAgainst].discards.some((d) => kindOf(d.tile) === kind);
    return safe
      ? `${tok(kind)} is in their discards: they cannot ron on it.`
      : `${tok(kind)} is not in their discards, so it could be their winning tile.`;
  }
  const result = o.tenpai
    ? `Tenpai, waiting on ${toks(o.waits.map((w) => w.kind))}${o.furiten ? ' (but furiten)' : ''}.`
    : `${away(o.shanten)[0].toUpperCase()}${away(o.shanten).slice(1)}, with ${o.total} tiles that improve the hand.`;
  if (goal === 'max-good-wait') {
    const good = `${result.slice(0, -1)}, ${goodWaitTotal(g, kind)} of them to a good wait.`;
    if (correct || o.shanten > opts[0].shanten) return good;
    return `${good} Another discard keeps ${goodWaitTotal(g, right())}.`;
  }
  if (goal === 'judgment') {
    if (correct) return result;
    const r = opts.find((x) => x.kind === right())!;
    if (r.shanten !== o.shanten || r.total > o.total) return `${result} Another discard is better.`;
    return r.total === o.total
      ? `${result} Another discard keeps as many tiles, and is better here.`
      : `${result} Another discard is better here, even with fewer tiles.`;
  }
  if (correct || goal === 'tenpai') return result;
  const best = opts[0];
  if (goal === 'min-shanten' || o.shanten > best.shanten) return `${result} Another discard keeps you closer.`;
  return `${result} Another discard leaves ${best.total}.`;
}

export function pickFeedback(answers: Set<Kind>, picked: Set<Kind>): string {
  const missing = [...answers].filter((k) => !picked.has(k));
  const wrong = [...picked].filter((k) => !answers.has(k));
  if (!missing.length && !wrong.length) return '';
  return [wrong.length ? `Not these: ${toks(wrong)}.` : '', missing.length ? `${missing.length} missing.` : '']
    .filter(Boolean)
    .join(' ');
}

const VERDICT_WHY: Record<Verdict, string> = {
  yes: 'The hand is complete and has a yaku.',
  'no-yaku': 'The hand is complete, but it has no yaku, so it cannot win.',
  furiten: 'One of your winning tiles is in your own discards: you are furiten and cannot ron.',
  'not-complete': 'This tile does not complete the hand.',
};

/** Why the true verdict holds, or (for a wrong guess) the engine fact that rules the guess out. */
export function verdictFeedback(g: GameState, chosen: Verdict, truth: Verdict): string {
  const w = winSpot(g);
  const ws = waits(w.concealed, w.melds);
  if (chosen === truth) {
    const tail = ws.length ? ` The hand waits on ${toks(ws)}.` : '';
    return VERDICT_WHY[truth] + (truth === 'not-complete' ? tail : '');
  }
  if (chosen === 'yes') return 'It cannot win on this tile.';
  if (chosen === 'not-complete') return 'This tile does complete the hand.';
  if (chosen === 'furiten') return 'None of your winning tiles is in your discards.';
  return truth === 'yes' ? 'The hand has a yaku.' : 'Check whether the tile completes the hand, and your discards.';
}
