<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { dev } from '$app/environment';
  import { afterNavigate, replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import Cta from '$lib/learn/components/Cta.svelte';
  import ExerciseCard from '$lib/learn/components/ExerciseCard.svelte';
  import Seo from '$lib/components/Seo.svelte';
  import { lessonBySlug } from '$lib/learn/registry';
  import type { Exercise, ExerciseOf } from '@mahjong/drills/types';
  import { Feed, type Problem } from '../feed';
  import { LEVELS, type Level, type TrainerId } from '@mahjong/drills/generate';
  import { problemPath, trainerById } from '../registry';
  import { recordAnswer, recordRush, statsLoaded, statsOf } from '../stats.svelte';
  import { trackOwner } from '$lib/progress/client.svelte';
  import ProgressNudge from '$lib/progress/ProgressNudge.svelte';
  import DiscardTable from './DiscardTable.svelte';
  import RushBar from './RushBar.svelte';

  interface Props {
    id: TrainerId;
    level: Level;
    mode: 'practice' | 'rush';
    seed: string;
    exercise: Exercise;
  }
  let props: Props = $props();

  // The page re-creates this component per trainer ({#key}): its props are the first problem, read once.
  const first = untrack(() => ({ ...props }));
  const meta = trainerById(first.id)!;
  const lesson = lessonBySlug(meta.lessons[0], dev);
  const levels = LEVELS[meta.id] as readonly Level[];
  const feed = new Feed(meta.id);

  let mode = $state(first.mode);
  let level = $state(first.level);
  let problem: Problem = $state({ level: first.level, seed: first.seed, exercise: first.exercise });
  /** Renders a new exercise card per problem. */
  let n = $state(0);

  trackOwner();
  onMount(() => {
    return () => {
      feed.stop();
      clearInterval(clock);
      clearTimeout(advance);
    };
  });

  function show(p: Problem) {
    problem = p;
    n++;
    feed.prefetch(currentLevel());
  }

  /** Keeps the address on what is shown: a Practice problem can be shared and reloaded as is. */
  function syncUrl() {
    const url =
      mode === 'rush'
        ? `/train/${meta.id}?${new URLSearchParams({ mode: 'rush' })}`
        : problemPath(meta.id, problem.level, problem.seed);
    if (page.url.pathname + page.url.search !== url) replaceState(url, {});
  }
  // The router can rewrite the address only once it has started (after hydration).
  let routerReady = $state(false);
  afterNavigate(() => (routerReady = true));
  $effect(() => {
    void [mode, problem];
    if (routerReady) untrack(syncUrl);
  });

  // --- practice -----------------------------------------------------------------------------------------------

  function setLevel(l: Level) {
    if (l === level) return;
    level = l;
    show(feed.next(l));
  }

  function practiceResult(r: { correct: boolean; firstTry: boolean }) {
    recordAnswer(meta.id, r.correct && r.firstTry);
  }

  const stats = $derived(statsLoaded() ? statsOf(meta.id) : null);
  const accuracy = $derived(stats && stats.answered ? Math.round((100 * stats.firstTry) / stats.answered) : null);

  // --- rush ---------------------------------------------------------------------------------------------------

  const RUSH_MS = 180_000;
  const STRIKES = 3;
  /** How long a missed problem stays, with its answer, before the next one. */
  const MISS_MS = 1400;
  const RIGHT_MS = 350;

  let phase: 'ready' | 'running' | 'over' = $state('ready');
  let score = $state(0);
  let strikes = $state(0);
  let left = $state(RUSH_MS);
  let newBest = $state(false);
  let clock: ReturnType<typeof setInterval> | undefined;
  let advance: ReturnType<typeof setTimeout> | undefined;

  const rushLevel = (solved: number) => meta.rush[Math.min(Math.floor(solved / 5), meta.rush.length - 1)];
  const currentLevel = () => (mode === 'rush' ? rushLevel(score) : level);

  function setMode(m: 'practice' | 'rush') {
    if (m === mode) return;
    stopRush();
    mode = m;
    phase = 'ready';
    if (m === 'practice') show(feed.next(level));
  }

  function startRush() {
    score = 0;
    strikes = 0;
    newBest = false;
    left = RUSH_MS;
    phase = 'running';
    show(feed.next(rushLevel(0)));
    const end = performance.now() + RUSH_MS;
    clock = setInterval(() => {
      left = Math.max(0, end - performance.now());
      if (left === 0) finishRush();
    }, 100);
  }

  function rushResult(r: { correct: boolean }) {
    if (phase !== 'running') return;
    if (r.correct) score++;
    else strikes++;
    if (strikes >= STRIKES) {
      clearInterval(clock);
      advance = setTimeout(finishRush, MISS_MS);
      return;
    }
    advance = setTimeout(() => show(feed.next(rushLevel(score))), r.correct ? RIGHT_MS : MISS_MS);
  }

  function stopRush() {
    clearInterval(clock);
    clearTimeout(advance);
  }

  function finishRush() {
    if (phase !== 'running') return;
    stopRush();
    phase = 'over';
    newBest = recordRush(meta.id, score);
  }

  const jsonld = $derived([
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Train', item: `${page.url.origin}/train` },
        { '@type': 'ListItem', position: 2, name: meta.title, item: `${page.url.origin}/train/${meta.id}` },
      ],
    },
  ]);
</script>

<Seo title={meta.seoTitle} description={meta.description} path="/train/{meta.id}" type="website" {jsonld} />

<div class="trainer">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/train">Train</a></nav>
  <h1>{meta.title}</h1>

  <div class="controls">
    <div class="seg mode" role="radiogroup" aria-label="Mode">
      {#each [['practice', 'Practice'], ['rush', 'Rush']] as const as [m, label] (m)}
        <label class:on={mode === m}
          ><input type="radio" name="mode" checked={mode === m} onchange={() => setMode(m)} />{label}</label
        >
      {/each}
    </div>
    {#if mode === 'practice' && levels.length > 1}
      <div class="seg levels" style:--n={levels.length} role="radiogroup" aria-label="Level">
        {#each levels as l (l)}
          <label class:on={level === l}
            ><input type="radio" name="level" checked={level === l} onchange={() => setLevel(l)} />{meta.levels[l]}</label
          >
        {/each}
      </div>
    {/if}
  </div>

  {#if mode === 'practice'}
    <div class="stats" aria-label="Your stats">
      <span title="Streak"><b>{stats?.streak ?? '–'}</b> streak</span>
      <span title="Best streak"><b>{stats?.bestStreak ?? '–'}</b> best</span>
      <span title="Right first time"><b>{accuracy ?? '–'}{accuracy === null ? '' : '%'}</b></span>
    </div>
    {#key n}
      <ExerciseCard id="p{n}" exercise={problem.exercise} onresult={practiceResult}>
        {#snippet after({ discarded })}
          <button class="btn primary big next" onclick={() => show(feed.next(level))}>Next</button>
          {#if problem.exercise.kind === 'discard'}
            <DiscardTable exercise={problem.exercise as ExerciseOf<'discard'>} {discarded} />
          {/if}
        {/snippet}
      </ExerciseCard>
    {/key}
  {:else if phase === 'ready'}
    <section class="rush-start">
      <p class="best"><b>{stats?.rushBest ?? 0}</b> best</p>
      <button class="btn primary big" onclick={startRush}>Start</button>
    </section>
  {:else if phase === 'running'}
    <RushBar {left} total={RUSH_MS} {score} {strikes} max={STRIKES} />
    {#key n}
      <ExerciseCard id="r{n}" exercise={problem.exercise} final onresult={rushResult} />
    {/key}
  {:else}
    <section class="rush-start">
      <p class="score"><b>{score}</b></p>
      <p class="best">{#if newBest}<span class="chip gold">Best</span>{:else}<b>{stats?.rushBest ?? 0}</b> best{/if}</p>
      <button class="btn primary big" onclick={startRush}>Again</button>
      <ProgressNudge />
    </section>
  {/if}

  <section class="about">
    <p>{meta.intro}</p>
    {#if lesson}<p>Learn it first: <a href="/learn/{lesson.slug}">{lesson.title}</a>.</p>{/if}
  </section>
  <Cta />
</div>

<style>
  .crumbs {
    margin-top: 12px;
    font-size: 0.85rem;
  }
  .crumbs a {
    color: var(--ink-dim);
  }
  h1 {
    margin-top: 4px !important;
  }
  .controls {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .levels {
    grid-template-columns: repeat(var(--n), 1fr);
  }
  .stats {
    display: flex;
    gap: 14px;
    margin-top: 12px;
    font-size: 0.85rem;
    color: var(--ink-dim);
    font-variant-numeric: tabular-nums;
  }
  .stats b {
    color: var(--ink);
    font-weight: 700;
  }
  .next {
    min-height: 56px;
  }
  .rush-start {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    margin: 24px 0;
    text-align: center;
  }
  .rush-start p {
    margin: 0;
    font-variant-numeric: tabular-nums;
    color: var(--ink-dim);
  }
  .rush-start b {
    color: var(--ink);
  }
  .score b {
    font-size: 3rem;
    line-height: 1;
  }
  .about {
    margin-top: 28px;
    color: var(--ink-dim);
    font-size: 0.95rem;
  }
</style>
