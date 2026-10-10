<script lang="ts">
  import { onMount } from 'svelte';
  import Cta from '$lib/learn/components/Cta.svelte';
  import Seo from '$lib/components/Seo.svelte';
  import { DAILY, utcDate } from '$lib/train/daily';
  import { TRAINERS } from '$lib/train/registry';
  import { dailyOf, dailyStreak, statsLoaded, statsOf } from '$lib/train/stats.svelte';
  import { trackOwner } from '$lib/progress/client.svelte';
  import ProgressNudge from '$lib/progress/ProgressNudge.svelte';

  trackOwner();

  // The date is the browser's (UTC), read after mount like the stats.
  let today = $state('');
  onMount(() => (today = utcDate()));
  const daily = $derived(statsLoaded() && today ? dailyOf(today) : null);
  const streak = $derived(statsLoaded() && today ? dailyStreak(today, DAILY.length) : 0);
</script>

<Seo
  title="Riichi Mahjong Trainers: Discards, Waits, Yaku, Scoring"
  description="Free riichi mahjong practice: what to discard, every winning tile, the yaku in a hand, han, fu and points. Endless real hands, a daily set."
  path="/train"
  type="website"
/>

<h1>Train</h1>
<ProgressNudge />

<a class="card daily" href="/train/daily">
  <span class="name">Daily</span>
  <span class="what">A mix of every type</span>
  <span class="facts">
    {#if daily}<span><b>{daily.length}</b>/{DAILY.length}</span>{/if}
    {#if streak}<span><b>{streak}</b> days</span>{/if}
  </span>
</a>

<ul class="trainers">
  {#each TRAINERS as t (t.id)}
    {@const s = statsLoaded() ? statsOf(t.id) : null}
    <li>
      <a class="card" href="/train/{t.id}">
        <span class="name">{t.title}</span>
        <span class="what">{t.summary}</span>
        <span class="facts">
          {#if s?.answered}
            <span><b>{s.bestStreak}</b> best streak</span>
            {#if s.rushBest}<span><b>{s.rushBest}</b> rush</span>{/if}
          {/if}
        </span>
      </a>
    </li>
  {/each}
</ul>

<Cta />

<style>
  .trainers {
    list-style: none;
    padding: 0 !important;
    margin: 8px 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .card {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 2px 10px;
    padding: 14px;
    border-radius: var(--radius);
    background: var(--panel);
    color: var(--ink);
    text-decoration: none;
  }
  .card.daily {
    background: var(--surface-me);
    margin-top: 12px;
  }
  .name {
    font-weight: 700;
    font-size: 1.1rem;
  }
  .what {
    grid-column: 1;
    color: var(--ink-dim);
    font-size: 0.9rem;
  }
  .facts {
    grid-column: 2;
    grid-row: 1 / 3;
    align-self: center;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-size: 0.8rem;
    color: var(--ink-dim);
    font-variant-numeric: tabular-nums;
  }
  .facts b {
    color: var(--ink);
  }
</style>
