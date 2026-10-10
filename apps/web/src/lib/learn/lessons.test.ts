// Every lesson, exercise, glossary link and yaku example is checked against the engine, so the course cannot teach
// something the game does not do. Failures name the lesson slug, exercise id and variant number.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { analyzeHand, kindOf, legalActions, parseTiles, unseenCounts, waits } from '@mahjong/engine';
import { GLOSSARY, glossaryIds } from './glossary';
import {
  callChoices,
  discardAnswers,
  discardOptions,
  fuSteps,
  hasGoodWait,
  minRon,
  pickQuiz,
  scoreQuiz,
  stateOf,
  verdict,
  winValue,
  yakuQuiz,
} from '@mahjong/drills/goals';
import type { ExerciseSet } from './context';
import { LESSONS, REFERENCE, UNITS } from './registry';
import { sentences } from './text';
import { EXERCISE_KINDS, type Exercise } from '@mahjong/drills/types';
import { YAKU_LIST, hanIn, yakuTip, type YakuTipId } from './yaku';

const dir = fileURLToPath(new URL('./lessons/', import.meta.url));
const files = import.meta.glob<Record<string, ExerciseSet>>('./lessons/*/exercises.ts', {
  import: 'exercises',
  eager: true,
});
const exercisesOf = (slug: string) => files[`./lessons/${slug}/exercises.ts`] ?? {};
/** The article source (empty while missing: the registry test reports missing lessons). */
const source = (slug: string) =>
  existsSync(`${dir}${slug}/Lesson.svelte`) ? readFileSync(`${dir}${slug}/Lesson.svelte`, 'utf8') : '';

/**
 * Yaku names that must carry a yaku tooltip in lesson text. Left out: names that are also everyday words in the
 * lessons (riichi the declaration, self-draw the way of winning, the dragon and wind tiles, "one shot").
 */
const YAKU_NAMES = [
  ...YAKU_LIST.flatMap((y) => [y.name, y.english]).filter(
    (n) =>
      !/^(Riichi|Ready hand|Self-draw|Haku|Hatsu|Chun|(White|Green|Red) dragon|(Seat|Round) wind|One shot)$/.test(n),
  ),
  'yakuhai',
  'value triplets?',
];

/** Throws with a readable message if the exercise is not answerable as written. */
function validate(ex: Exercise): void {
  expect(sentences(ex.prompt), 'prompt has at most two sentences').toBeLessThanOrEqual(2);
  // Answer buttons need a question to answer (a call is answered with Pon/Chii/Pass, unless the prompt says which).
  if (ex.kind === 'can-win' || ex.kind === 'choice') expect(ex.prompt, 'prompt asks a question').toMatch(/\?$/);
  if (ex.kind === 'call')
    expect(ex.prompt, 'prompt asks a question or gives an order').toMatch(/\?$|\b(Complete|Make|Call)\b/);
  const g = stateOf(ex);
  // `scenario()` pads a short hand with junk, which silently changes what the hand is: count the hand as written.
  const written = 'position' in ex ? ex.position?.hands?.[0] : undefined;
  if (written) {
    const melds = ex.position!.melds?.[0]?.length ?? 0;
    expect(parseTiles(written.replace(/\s+/g, '')).length, 'hand size as written').toBe(13 - 3 * melds);
  }
  switch (ex.kind) {
    case 'discard': {
      expect(g!.hand.step, 'seat 0 is on turn').toMatchObject({
        type: 'turn',
        seat: 0,
      });
      const ok = discardAnswers(ex, g!);
      expect(ok.size, 'has a right discard').toBeGreaterThan(0);
      expect(ok.size, 'not every discard is right').toBeLessThan(discardOptions(g!).length);
      if (ex.only) {
        const all = discardAnswers({ ...ex, only: undefined }, g!);
        for (const k of parseTiles(ex.only).map(kindOf)) expect(all.has(k), `only: ${k} meets the goal`).toBe(true);
      }
      const opts = discardOptions(g!);
      if (ex.goal === 'judgment') {
        // The rule of thumb is authored; it must not quietly cost a step towards tenpai.
        expect(ex.only, 'a judgment names its answer').toBeTruthy();
        for (const k of ok) {
          const back = opts.find((o) => o.kind === k)!.shanten > opts[0].shanten;
          expect(back, `${k} ${ex.stepBack ? 'is marked as a step back' : 'keeps the lowest shanten'}`).toBe(
            !!ex.stepBack,
          );
        }
      } else expect(ex.stepBack, 'stepBack only for judgment').toBeUndefined();
      if (ex.goal === 'max-good-wait')
        for (const k of ok) expect(opts.find((o) => o.kind === k)!.shanten, 'good waits are about 1-shanten').toBe(1);
      if (typeof ex.goal === 'object' && 'safest' in ex.goal)
        expect(g!.hand.players[ex.goal.safest].riichi, 'safest against a riichi').not.toBeNull();
      break;
    }
    case 'pick': {
      const { palette, answers } = pickQuiz(ex, g!);
      expect(answers.size, 'has answers').toBeGreaterThan(0);
      for (const k of answers) expect(palette, 'palette offers every answer').toContain(k);
      expect(answers.size, 'not every tile is an answer').toBeLessThan(palette.length);
      if (ex.goal === 'waits' || ex.goal === 'ukeire') {
        const me = g!.hand.players[0];
        expect(me.hand.length + 3 * me.melds.length, 'seat 0 holds 13 tiles').toBe(13);
      }
      break;
    }
    case 'call': {
      const choices = callChoices(g!);
      expect([...choices], 'the call is offered').toContain(ex.goal);
      expect(choices.size, 'there is a choice to make').toBeGreaterThan(1);
      // A win beats any call: a call exercise that offers ron teaches the wrong choice (unless ron is the point).
      if (ex.goal !== 'ron') expect([...choices], 'no ron on offer').not.toContain('ron');
      break;
    }
    case 'can-win': {
      const v = verdict(g!);
      if (ex.expect) expect(v, 'verdict the text relies on').toBe(ex.expect);
      break;
    }
    case 'yaku': {
      const answers = yakuQuiz(ex, g!).answers;
      expect(answers.size).toBeGreaterThan(0);
      if (ex.expect) expect([...answers].sort(), 'yaku the text names').toEqual([...ex.expect].sort());
      break;
    }
    case 'score': {
      const q = scoreQuiz(ex, g!);
      expect(q.answer).toBeGreaterThanOrEqual(0);
      expect(q.options.length, 'four options').toBe(4);
      if (ex.expect) expect(q.options[q.answer], 'value the text states').toBe(ex.expect);
      break;
    }
    case 'fu':
      expect(fuSteps(g!).length).toBeGreaterThan(1);
      if (ex.expect) expect(fuSteps(g!).at(-1)!.answer, 'fu the text states').toBe(ex.expect);
      winValue(g!);
      break;
    case 'choice': {
      expect(ex.answer).toBeGreaterThanOrEqual(0);
      expect(ex.answer).toBeLessThan(ex.options.length);
      if (ex.claim && g) {
        const me = g.hand.players[0];
        expect(me.hand.length + 3 * me.melds.length, 'claims are about a 13-tile hand').toBe(13);
        const a = analyzeHand(me.hand, me.melds, unseenCounts(g, 0));
        if (ex.claim.shanten !== undefined) expect(a.shanten, 'claimed shanten').toBe(ex.claim.shanten);
        if (ex.claim.waits !== undefined)
          expect(waits(me.hand, me.melds), 'claimed waits').toEqual(parseTiles(ex.claim.waits).map(kindOf));
        if (ex.claim.tenpai !== undefined) expect(a.tenpai, 'claimed tenpai').toBe(ex.claim.tenpai);
        if (ex.claim.liveWaits !== undefined) expect(a.total, 'claimed live tiles').toBe(ex.claim.liveWaits);
        if (ex.claim.goodWait !== undefined) expect(hasGoodWait(g), 'claimed good wait').toBe(ex.claim.goodWait);
        if (ex.claim.minRon !== undefined) expect(minRon(g), 'claimed minimum ron').toBe(ex.claim.minRon);
      }
      break;
    }
  }
  // `show` flags must be ones this kind can display (a flag that silently does nothing hides a mistake).
  const win = ['can-win', 'yaku', 'score', 'fu'].includes(ex.kind);
  const slice =
    ['discard', 'call', 'choice'].includes(ex.kind) ||
    (ex.kind === 'pick' && (ex.goal === 'waits' || ex.goal === 'ukeire'));
  if (ex.show?.wall) expect(slice, 'wall count is shown in the hand slice only').toBe(true);
  if (ex.show?.seat || ex.show?.counters) expect(win, 'seat and counters are shown with winning hands only').toBe(true);
  if (ex.show?.round || ex.show?.dora)
    expect(win || slice, 'round and dora need a hand slice or winning hand').toBe(true);
  if (ex.show && Object.values(ex.show).some(Boolean)) expect(g, 'shown facts need a position').not.toBeNull();
  // A position the reader acts in must be legal for seat 0.
  if (g && (ex.kind === 'discard' || ex.kind === 'call')) expect(legalActions(g, 0).length).toBeGreaterThan(0);
}

/** Variants per set: enough hands in a row for the idea to stick. */
const MIN_VARIANTS = 3;

/** Throws if the variants of a set are not the same task on different hands. */
function validateSet(set: ExerciseSet): void {
  expect(set.length, `at least ${MIN_VARIANTS} variants`).toBeGreaterThanOrEqual(MIN_VARIANTS);
  const [first] = set;
  for (const [i, ex] of set.entries()) {
    expect(ex.kind, `variant ${i + 1} has the set's kind`).toBe(first.kind);
    if ((ex.kind === 'discard' || ex.kind === 'pick') && 'goal' in first)
      expect(ex.goal, `variant ${i + 1} has the set's goal`).toEqual(first.goal);
  }
  // Different hands (or, for questions without one, different questions).
  const keys = set.map((ex) => JSON.stringify('position' in ex && ex.position ? ex.position : ex.prompt));
  expect(new Set(keys).size, 'no variant repeats another').toBe(set.length);
}

describe('lesson registry', () => {
  it('has unique slugs, titles and descriptions', () => {
    for (const key of ['slug', 'title', 'seoTitle', 'description'] as const) {
      const values = [
        ...LESSONS.map((l) => l[key]),
        ...(key === 'slug' ? [] : Object.values(REFERENCE).map((r) => r[key])),
      ];
      expect(new Set(values).size, key).toBe(values.length);
    }
  });

  it('lists lessons unit by unit, in unit order', () => {
    const order = LESSONS.map((l) => UNITS.findIndex((u) => u.id === l.unit));
    expect(order.every((u) => u >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it('has URL-safe slugs, sensible metadata and existing related lessons', () => {
    for (const l of LESSONS) {
      expect(l.slug, l.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(l.description.length, `${l.slug} description`).toBeLessThanOrEqual(165);
      expect(l.related.length, `${l.slug} related`).toBeGreaterThanOrEqual(2);
      for (const d of [l.published, l.updated]) {
        expect(d, `${l.slug} date`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(Number.isNaN(Date.parse(d)), `${l.slug} date ${d}`).toBe(false);
      }
      expect(l.published <= l.updated, `${l.slug} published after updated`).toBe(true);
      for (const r of l.related)
        expect(
          LESSONS.some((x) => x.slug === r),
          `${l.slug} → ${r}`,
        ).toBe(true);
    }
  });

  it('has an article and exercises for every lesson, and nothing else', () => {
    const folders = readdirSync(dir).sort();
    expect(folders).toEqual(LESSONS.map((l) => l.slug).sort());
  });

  it('uses every exercise kind somewhere', () => {
    const used = new Set(LESSONS.flatMap((l) => Object.values(exercisesOf(l.slug)).flatMap((set) => set.map((e) => e.kind))));
    expect([...used].sort()).toEqual([...EXERCISE_KINDS].sort());
  });
});

describe.each(LESSONS.map((l) => [l.slug, l] as const))('lesson %s', (slug, meta) => {
  const exercises = exercisesOf(slug);
  const src = source(slug);

  it('places exactly the exercises it defines', () => {
    const placed = [...src.matchAll(/<Exercise id="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(placed).size, 'each exercise placed once').toBe(placed.length);
    expect(placed.sort()).toEqual(Object.keys(exercises).sort());
    if (!meta.descriptive) expect(placed.length, 'has an exercise').toBeGreaterThan(0);
  });

  it('is only parts, each with a heading and exactly one exercise', () => {
    // Bite-sized: the lesson shows one part at a time, and the part count is the exercise count.
    const body = src.replace(/<script[\s\S]*?<\/script>/, '').trim();
    const parts = [...body.matchAll(/<Part title="([^"]+)">([\s\S]*?)<\/Part>/g)];
    expect(parts.length, 'has parts').toBeGreaterThan(0);
    expect(body.replace(/<Part title="[^"]+">[\s\S]*?<\/Part>/g, '').trim(), 'nothing outside parts').toBe('');
    for (const [, title, content] of parts) {
      expect(content.match(/<Exercise id=/g)?.length ?? 0, `part "${title}" has one exercise`).toBe(1);
    }
  });

  it('links only existing glossary terms', () => {
    for (const m of src.matchAll(/<Term id="([^"]+)"/g)) expect(glossaryIds.has(m[1]), `term ${m[1]}`).toBe(true);
  });

  it('links only existing yaku', () => {
    for (const m of src.matchAll(/<Yaku id="([^"]+)"/g))
      expect(() => yakuTip(m[1] as YakuTipId), `yaku ${m[1]}`).not.toThrow();
  });

  it('gives every yaku it names a yaku tooltip', () => {
    // The text outside <Yaku> (a gloss in brackets right after one counts as covered), headings and captions.
    const text = src
      .replace(/<script[\s\S]*?<\/script>/, '')
      .replace(/<Yaku [^>]*>[\s\S]*?<\/Yaku>(\s+\([^)]*\))?/g, ' ')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ');
    for (const name of YAKU_NAMES)
      expect(text, `"${name}" without <Yaku>`).not.toMatch(new RegExp(`\\b${name}\\b`, 'i'));
  });

  it('links only existing lessons', () => {
    for (const m of src.matchAll(/href="\/learn\/([a-z0-9-]+)/g)) {
      const ok = LESSONS.some((l) => l.slug === m[1]) || m[1] === 'yaku' || m[1] === 'glossary';
      expect(ok, `link /learn/${m[1]}`).toBe(true);
    }
  });

  it.each(Object.entries(exercises))('exercise %s is a set of one idea', (_id, set) => {
    validateSet(set);
  });

  it.each(Object.entries(exercises).flatMap(([id, set]) => set.map((ex, i) => [`${id} #${i + 1}`, ex] as const)))(
    'exercise %s is answerable',
    (_name, ex) => {
      validate(ex);
    },
  );
});

describe('glossary', () => {
  it('points every entry at an existing lesson, with unique ids', () => {
    expect(glossaryIds.size).toBe(GLOSSARY.length);
    for (const g of GLOSSARY)
      expect(
        LESSONS.some((l) => l.slug === g.lesson),
        `${g.id} → ${g.lesson}`,
      ).toBe(true);
  });
});

describe('yaku list', () => {
  it('has each yaku once', () => {
    expect(new Set(YAKU_LIST.map((y) => y.id)).size).toBe(YAKU_LIST.length);
  });

  it.each(YAKU_LIST.map((y) => [y.id, y] as const))('%s: the examples score with the listed han', (_id, y) => {
    const closed = !(y.example.melds ?? []).some(([t]) => t !== 'ankan');
    expect(hanIn(y, y.example), 'example han').toBe(closed ? y.han : y.open);
    if (y.openExample) {
      expect(y.open, 'open value listed').not.toBeNull();
      expect(hanIn(y, y.openExample), 'open example han').toBe(y.open);
    }
  });
});
