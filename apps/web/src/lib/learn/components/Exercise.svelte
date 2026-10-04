<script lang="ts">
  import { getContext, onMount, setContext, untrack } from 'svelte';
  import {
    type Action,
    type Kind,
    type YakuId,
    doraFromIndicator,
    kindOf,
    viewFor,
  } from '@mahjong/engine';
  import PlayerArea from '$lib/components/PlayerArea.svelte';
  import Tile from '$lib/components/Tile.svelte';
  import { TILE_MARKS, type TileMarks } from '$lib/marks';
  import { LESSON, type LessonContext } from '$lib/learn/context';
  import { discardFeedback, pickFeedback, verdictFeedback } from '$lib/learn/feedback';
  import {
    VERDICTS,
    discardAnswers,
    fuSteps,
    pickQuiz,
    scoreQuiz,
    stateOf,
    verdict,
    winValue,
    yakuName,
    yakuQuiz,
  } from '$lib/learn/goals';
  import { RED, tok } from '$lib/learn/position';
  import { markSolved, solved as wasSolved } from '$lib/learn/progress.svelte';
  import type { CallChoice, Verdict } from '$lib/learn/types';
  import Ponds from './Ponds.svelte';
  import { segments } from '$lib/learn/text';
  import Rich from './Rich.svelte';
  import Tiles from './Tiles.svelte';
  import WinFigure from './WinFigure.svelte';

  let { id }: { id: string } = $props();

  const lesson = getContext<LessonContext>(LESSON);
  // An exercise card is created for one id (lessons never change it), so it is read once.
  const exId = untrack(() => id);
  const ex = lesson.exercises[exId];
  if (!ex) throw new Error(`Exercise ${exId} not found in ${lesson.slug}`);
  const g = stateOf(ex);

  type Status = 'open' | 'wrong' | 'solved' | 'revealed';
  let status = $state<Status>('open');
  let message = $state('');
  let tries = $state(0);
  /** Solved on an earlier visit: shown as done, still playable. */
  let doneBefore = $state(false);
  onMount(() => (doneBefore = wasSolved(lesson.slug, exId)));

  const finished = $derived(status === 'solved' || status === 'revealed');
  const hasFeedback = $derived(!!message || status === 'solved' || (doneBefore && status === 'open'));

  function right(text = '') {
    status = 'solved';
    message = [text, ex.why].filter(Boolean).join(' ');
    markSolved(lesson.slug, exId);
  }
  function wrong(text: string) {
    status = 'wrong';
    tries++;
    message = text || 'Not quite. Try again.';
  }
  function reveal() {
    status = 'revealed';
    message = [revealText(), ex.why].filter(Boolean).join(' ');
  }

  // Board-wide tile cues inside the card: gold for dora, blue for the kind being looked at.
  let focusKind: Kind | null = $state(null);
  const marks: TileMarks = $state({
    // Dora glow only where the exercise shows the dora: an unexplained gold tile is noise for a beginner.
    dora: new Set(
      g && ex.show?.dora ? g.hand.doraIndicators.slice(0, g.hand.doraRevealed).map((t) => doraFromIndicator(kindOf(t))) : [],
    ),
    focus: null,
  });
  $effect(() => {
    marks.focus = focusKind;
  });
  setContext(TILE_MARKS, marks);

  // --- per kind ---------------------------------------------------------------------------------------------

  const discardOk = ex.kind === 'discard' ? discardAnswers(ex, g!) : new Set<Kind>();
  const pick = ex.kind === 'pick' ? pickQuiz(ex, g!) : null;
  const yaku = ex.kind === 'yaku' ? yakuQuiz(ex, g!) : null;
  const score = ex.kind === 'score' ? scoreQuiz(ex, g!) : null;
  const steps = ex.kind === 'fu' ? fuSteps(g!) : [];
  const indicatorNotation = g
    ? g.hand.doraIndicators.slice(0, g.hand.doraRevealed).map((t) => tok(kindOf(t)).slice(1, -1)).join(' ')
    : '';
  const truth: Verdict | null = ex.kind === 'can-win' ? verdict(g!) : null;

  /** The view the hand slice shows: plain discards only (discard), the call window (call), else read-only. */
  const baseView = g ? viewFor(g, 0, { hints: 'off' }) : null;
  const view = $derived.by(() => {
    if (!baseView) return null;
    const live =
      ex.kind === 'discard' ? !finished : ex.kind === 'call' ? !finished : false;
    const actions = !live
      ? []
      : ex.kind === 'discard'
        ? baseView.actions.filter((a) => a.type === 'discard' && !a.riichi)
        : baseView.actions;
    return { ...baseView, actions };
  });
  /** Panel parts the exercise asks for; a read-only hand without any drops the panel row. */
  const info = { round: !!ex.show?.round, dora: !!ex.show?.dora, wall: !!ex.show?.wall };
  const infoShown = info.round || info.dora || info.wall;
  /** Answers marked with the green dot once solved or revealed. */
  const marked = $derived(
    finished && ex.kind === 'discard' ? discardOk : new Set<Kind>(),
  );

  function onact(a: Action) {
    if (finished) return;
    if (ex.kind === 'discard' && a.type === 'discard') {
      const k = kindOf(a.tile);
      const ok = discardOk.has(k);
      const text = discardFeedback(ex, g!, k, ok);
      if (ok) right(text);
      else wrong(text);
    } else if (ex.kind === 'call') {
      const choice = a.type as CallChoice;
      if (choice === ex.goal) right(`${CALL_LABEL[choice]}.`);
      else wrong(`Not ${CALL_LABEL[choice]}. Try another option.`);
    }
  }

  /** An option that is only tiles (like "{6z}") shows them at tile size, not text size. */
  const tilesOnly = (o: string) => segments(o).every((x) => 'tiles' in x || !x.text.trim());

  const CALL_LABEL: Record<CallChoice, string> = { ron: 'Ron', pon: 'Pon', chii: 'Chii', daiminkan: 'Kan', pass: 'Pass' };

  // pick / yaku: toggle then check
  let picked: Set<number | string> = $state(new Set());
  function toggle(v: number | string) {
    if (finished) return;
    const next = new Set(picked);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    picked = next;
    if (status === 'wrong') status = 'open';
  }
  function checkPick() {
    if (pick) {
      const p = picked as Set<Kind>;
      const text = pickFeedback(pick.answers, p);
      if (!text) right();
      else wrong(text);
    } else if (yaku) {
      const p = picked as Set<YakuId>;
      const missing = [...yaku.answers].filter((y) => !p.has(y));
      const extra = [...p].filter((y) => !yaku.answers.has(y));
      if (!missing.length && !extra.length) right(yakuSummary());
      else
        wrong(
          [extra.length ? `Not: ${extra.map(yakuName).join(', ')}.` : '', missing.length ? `${missing.length} missing.` : '']
            .filter(Boolean)
            .join(' '),
        );
    }
  }

  function yakuSummary(): string {
    const v = winValue(g!).value;
    const parts = v.yaku.map((y) => `${yakuName(y.id)} ${y.han}`);
    if (v.dora + v.redDora + v.uraDora) parts.push(`dora ${v.dora + v.redDora + v.uraDora}`);
    return `${parts.join(', ')}: ${v.han} han ${v.fu} fu.`;
  }

  // single-choice kinds: can-win, score, choice
  let chosen: number | string | null = $state(null);
  function choose(v: number | string) {
    if (finished) return;
    chosen = v;
    if (ex.kind === 'can-win') {
      const text = verdictFeedback(g!, v as Verdict, truth!);
      if (v === truth) right(text);
      else wrong(text);
    } else if (ex.kind === 'score') {
      if (v === score!.answer) right(yakuSummary());
      else wrong('Not that one. Count the han, then the fu.');
    } else if (ex.kind === 'choice') {
      if (v === ex.answer) right();
      else wrong('');
    }
  }

  // fu: one step at a time
  let step = $state(0);
  let stepWrong: number | null = $state(null);
  function answerStep(v: number) {
    if (finished) return;
    const s = steps[step];
    if (v !== s.answer) {
      stepWrong = v;
      wrong(`Not ${v}.`);
      return;
    }
    stepWrong = null;
    status = 'open';
    message = '';
    if (step === steps.length - 1) right(`${steps[step].answer} fu.`);
    else step++;
  }

  function revealText(): string {
    switch (ex.kind) {
      case 'discard':
        return `Right: ${[...discardOk].map(tok).join(' ')}.`;
      case 'pick':
        return `Answer: ${[...pick!.answers].map(tok).join(' ')}.`;
      case 'call':
        return `${CALL_LABEL[ex.goal]}.`;
      case 'can-win':
        return verdictFeedback(g!, truth!, truth!);
      case 'yaku':
        return yakuSummary();
      case 'score':
        return `${score!.options[score!.answer]}. ${yakuSummary()}`;
      case 'fu':
        step = steps.length - 1;
        return steps.map((s) => `${s.label}: ${s.answer}`).join(' · ');
      case 'choice':
        return ex.options[ex.answer];
    }
  }

</script>

<section class="exercise" class:done={finished || doneBefore} aria-labelledby="ex-{id}">
  <p class="prompt" id="ex-{id}"><Rich text={ex.prompt} /></p>

  {#if g && ex.show?.ponds}
    <Ponds state={g} seats={ex.show.ponds} />
  {/if}

  {#if (ex.kind === 'discard' || ex.kind === 'call') && view}
    <div class="slice">
      <PlayerArea {view} red={RED} quickDiscard={false} bind:focusKind {onact} {marked} showWaits={false} {info} />
    </div>
  {:else if ex.kind === 'pick' && pick}
    {#if ex.goal === 'dora' && g}
      <Tiles t={indicatorNotation} max={30} caption="Dora indicator" center />
    {:else if (ex.goal === 'waits' || ex.goal === 'ukeire') && view}
      <div class="slice">
        <PlayerArea
          view={{ ...view, actions: [] }}
          red={RED}
          quickDiscard={false}
          bind:focusKind
          onact={() => {}}
          showWaits={false}
          {info}
          panel={infoShown}
        />
      </div>
    {/if}
    <div class="palette" class:full={pick.palette.length > 20} role="group" aria-label="Tiles to pick">
      {#each pick.palette as k (k)}
        <Tile
          tile={k * 4 + 1}
          red={RED}
          plain
          selected={picked.has(k)}
          mark={finished && pick.answers.has(k) ? 'hint' : null}
          onclick={() => toggle(k)}
        />
      {/each}
    </div>
  {:else if g && (ex.kind === 'can-win' || ex.kind === 'yaku' || ex.kind === 'score' || ex.kind === 'fu')}
    <WinFigure state={g} show={ex.show} />
  {:else if ex.kind === 'choice' && view}
    <div class="slice">
      <PlayerArea
        {view}
        red={RED}
        quickDiscard={false}
        bind:focusKind
        onact={() => {}}
        showWaits={false}
        {info}
        panel={infoShown}
      />
    </div>
  {/if}

  <div class="answers" class:empty={ex.kind === 'discard' || ex.kind === 'call'}>
    {#if ex.kind === 'pick' || ex.kind === 'yaku'}
      {#if yaku}
        <div class="options multi">
          {#each yaku.options as y (y)}
            <button
              class="btn opt"
              class:on={picked.has(y)}
              class:right={finished && yaku.answers.has(y)}
              aria-pressed={picked.has(y)}
              onclick={() => toggle(y)}>{yakuName(y)}</button
            >
          {/each}
        </div>
      {/if}
      <button class="btn primary" disabled={finished || picked.size === 0} onclick={checkPick}>Check</button>
    {:else if ex.kind === 'can-win'}
      <div class="options">
        {#each VERDICTS as v (v.id)}
          <button
            class="btn opt"
            class:on={chosen === v.id}
            class:right={finished && truth === v.id}
            onclick={() => choose(v.id)}>{v.label}</button
          >
        {/each}
      </div>
    {:else if ex.kind === 'score' && score}
      <div class="options">
        {#each score.options as o, i (o)}
          <button class="btn opt" class:on={chosen === i} class:right={finished && score.answer === i} onclick={() => choose(i)}
            >{o}</button
          >
        {/each}
      </div>
    {:else if ex.kind === 'choice'}
      <div class="options">
        {#each ex.options as o, i (i)}
          <button
            class="btn opt"
            class:tiles-only={tilesOnly(o)}
            class:on={chosen === i}
            class:right={finished && ex.answer === i}
            onclick={() => choose(i)}><Rich text={o} /></button
          >
        {/each}
      </div>
    {:else if ex.kind === 'fu'}
      <ol class="fu">
        {#each steps.slice(0, step + 1) as s, i (i)}
          <li class:current={i === step && !finished}>
            <span class="label"><Rich text={s.label} /></span>
            {#if i < step || finished}
              <span class="value">{i === 0 || i === steps.length - 1 ? '' : '+'}{s.answer}</span>
            {:else}
              <span class="choices">
                {#each s.options as v (v)}
                  <button class="btn opt small" class:on={stepWrong === v} onclick={() => answerStep(v)}>{v}</button>
                {/each}
              </span>
            {/if}
          </li>
        {/each}
      </ol>
    {/if}
  </div>

  <!-- Always in the page (a live region), but takes no room until there is something to say. -->
  <div class="feedback {status}" class:empty={!hasFeedback} aria-live="polite">
    {#if status === 'solved' || (doneBefore && status === 'open' && !message)}<strong class="check">✓</strong>{/if}
    {#if message}<span><Rich text={message} /></span>{/if}
    {#if status === 'wrong' && tries > 0}
      <button class="btn ghost small" onclick={reveal}>Show answer</button>
    {/if}
  </div>
</section>

<style>
  .exercise {
    /* Tile rows inside measure the card (see --col in app.css). */
    container-type: inline-size;
    background: var(--surface-me);
    border-radius: var(--radius);
    padding: 14px 12px 12px;
    margin: 18px 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .prompt {
    margin: 0;
    font-weight: 600;
  }
  .slice {
    /* PlayerArea anchors its magnifier above the hand; leave it room inside the card. */
    padding-top: 8px;
  }
  .palette {
    --tw: 30px;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px;
  }
  .palette.full {
    --col: 100cqw;
    --tw: min(30px, calc((var(--col) - 48px) / 9));
    display: grid;
    grid-template-columns: repeat(9, auto);
    justify-content: center;
  }
  .answers {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }
  .opt {
    min-height: 44px;
    font-weight: 600;
  }
  .opt.tiles-only {
    padding: 6px;
  }
  .opt.tiles-only :global(.inline) {
    --tw: 26px;
    vertical-align: middle;
  }
  .opt.on {
    background: var(--ink);
    color: var(--panel);
  }
  .opt.right {
    background: var(--ok);
    color: #0d2a14;
  }
  .small {
    min-height: 36px;
    padding: 4px 10px;
  }
  .fu {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-variant-numeric: tabular-nums;
  }
  .fu li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 36px;
  }
  .fu .value {
    font-weight: 700;
  }
  .choices {
    display: flex;
    gap: 4px;
  }
  .feedback {
    display: flex;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 6px 10px;
    font-size: 0.95rem;
  }
  .answers.empty {
    display: none;
  }
  .feedback.empty {
    margin-top: -12px;
  }
  .feedback.wrong span {
    color: var(--ink);
  }
  .check {
    display: inline-grid;
    place-items: center;
    width: 1.5em;
    height: 1.5em;
    border-radius: 50%;
    background: var(--ok);
    color: #0d2a14;
  }
</style>
