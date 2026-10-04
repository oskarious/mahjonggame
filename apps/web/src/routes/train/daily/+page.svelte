<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import Cta from '$lib/learn/components/Cta.svelte';
  import ExerciseCard from '$lib/learn/components/ExerciseCard.svelte';
  import type { ExerciseOf } from '$lib/learn/types';
  import DiscardTable from '$lib/train/components/DiscardTable.svelte';
  import Seo from '$lib/learn/components/Seo.svelte';
  import { shareLine } from '$lib/train/daily';
  import { trainerById } from '$lib/train/registry';
  import { dailyOf, dailyStreak, loadStats, recordDaily, statsLoaded } from '$lib/train/stats.svelte';

  let { data } = $props();

  const total = $derived(data.problems.length);
  /** The problem on screen; set from this device's results once they are read. */
  let shown = $state(0);

  onMount(() => {
    loadStats();
    shown = dailyOf(data.date).length;
  });

  const results = $derived(statsLoaded() ? dailyOf(data.date) : []);
  const done = $derived(statsLoaded() && shown >= total);
  const current = $derived(data.problems[Math.min(shown, total - 1)]);
  const streak = $derived(statsLoaded() ? dailyStreak(data.date, total) : 0);
  const line = $derived(shareLine(data.date, results, `${page.url.origin}/train/daily`));

  function onresult(r: { correct: boolean }) {
    recordDaily(data.date, r.correct);
  }

  let copied = $state(false);
  let text: HTMLTextAreaElement | undefined = $state();
  async function copy() {
    try {
      await navigator.clipboard.writeText(line);
    } catch {
      // No clipboard API outside secure contexts: select the text, and try the old way.
      text?.select();
      document.execCommand?.('copy');
    }
    copied = true;
  }
  const canShare = $derived(statsLoaded() && typeof navigator !== 'undefined' && !!navigator.share);
  function share() {
    navigator.share({ text: line }).catch(() => {});
  }
</script>

<Seo
  title="Daily Riichi Mahjong Puzzles"
  description="Five riichi mahjong problems a day, the same for everyone: discards, waits, yaku and scoring. Share your result."
  path="/train/daily"
  type="website"
/>

<nav class="crumbs" aria-label="Breadcrumb"><a href="/train">Train</a></nav>
<h1>Daily</h1>

<div class="marks" aria-label="Today's results">
  {#each data.problems as _, i (i)}
    <span class="mark" class:right={results[i] === true} class:missed={results[i] === false} class:now={i === shown && !done}
    ></span>
  {/each}
  {#if streak}<span class="streak"><b>{streak}</b> days</span>{/if}
</div>

{#if done}
  <section class="result">
    <p class="score"><b>{results.filter(Boolean).length}</b>/{total}</p>
    <textarea bind:this={text} readonly rows="2" value={line} aria-label="Your result"></textarea>
    <div class="share">
      <button class="btn primary" onclick={copy}>{copied ? 'Copied' : 'Copy'}</button>
      {#if canShare}<button class="btn" onclick={share}>Share</button>{/if}
    </div>
    <p class="more"><a class="btn" href="/train">More training</a></p>
  </section>
{:else}
  <p class="which">{trainerById(current.trainer)?.title}</p>
  {#key shown}
    <ExerciseCard id="d{shown}" exercise={current.exercise} final {onresult}>
      {#snippet after({ discarded })}
        <button class="btn primary big next" onclick={() => shown++}>{shown === total - 1 ? 'Result' : 'Next'}</button>
        {#if current.exercise.kind === 'discard'}
          <DiscardTable exercise={current.exercise as ExerciseOf<'discard'>} {discarded} />
        {/if}
      {/snippet}
    </ExerciseCard>
  {/key}
{/if}

<Cta />

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
  .marks {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .mark {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid var(--ink-dim);
  }
  .mark.now {
    border-color: var(--ink);
  }
  .mark.right {
    background: var(--ok);
    border-color: var(--ok);
  }
  .mark.missed {
    background: var(--danger);
    border-color: var(--danger);
  }
  .streak {
    margin-left: auto;
    font-size: 0.85rem;
    color: var(--ink-dim);
    font-variant-numeric: tabular-nums;
  }
  .streak b {
    color: var(--ink);
  }
  .which {
    margin: 14px 0 -8px;
    font-size: 0.8rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink-dim);
  }
  .next {
    min-height: 56px;
  }
  .result {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 18px 0;
  }
  .score {
    margin: 0;
    text-align: center;
    font-variant-numeric: tabular-nums;
    color: var(--ink-dim);
  }
  .score b {
    font-size: 3rem;
    color: var(--ink);
  }
  textarea {
    resize: none;
    font: inherit;
    font-size: 0.9rem;
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid var(--line);
    background: var(--panel);
    color: var(--ink);
  }
  .share {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
    gap: 6px;
  }
  .more {
    margin: 0;
    display: grid;
  }
  .more .btn {
    text-decoration: none;
  }
</style>
