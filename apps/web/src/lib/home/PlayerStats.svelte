<script lang="ts">
  import RankBadge from '$lib/components/RankBadge.svelte';
  import type { Week } from '$lib/server/home';
  import { DAILY } from '$lib/train/daily';
  import { TRAINERS } from '$lib/train/registry';
  import { dailyStreak, statsLoaded, statsOf } from '$lib/train/stats.svelte';

  /**
   * A signed-in player's numbers in one row: rating with its change this week, games this week, the daily set's day
   * streak and the best trainer streak. The page calls `trackOwner()` and passes the browser's UTC date.
   */
  let { rating, week, today }: { rating: number; week: Week; today: string } = $props();

  const streak = $derived(statsLoaded() && today ? dailyStreak(today, DAILY.length) : 0);
  const best = $derived(statsLoaded() ? Math.max(0, ...TRAINERS.map((t) => statsOf(t.id).bestStreak)) : 0);
  const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
</script>

<dl class="stats">
  <div>
    <dt>Rating</dt>
    <dd>
      <RankBadge {rating} />
      {#if week.change}<span class="change" class:up={week.change > 0}>{signed(week.change)}</span>{/if}
    </dd>
  </div>
  <div>
    <dt>Games</dt>
    <dd>{week.games} <span class="unit">/ 7d</span></dd>
  </div>
  <div>
    <dt>Daily</dt>
    <dd>{streak} <span class="unit">days</span></dd>
  </div>
  <div>
    <dt>Best</dt>
    <dd>{best} <span class="unit">streak</span></dd>
  </div>
</dl>

<style>
  .stats {
    display: grid;
    grid-template-columns: 1.4fr 1fr 1fr 1fr;
    gap: 6px;
    margin: 8px 0;
  }
  .stats div {
    padding: 10px;
    border-radius: var(--radius);
    background: var(--panel);
    min-width: 0;
  }
  dt {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--ink-dim);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  dd {
    margin: 2px 0 0;
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0 4px;
    font-weight: 700;
    font-size: 1.05rem;
    font-variant-numeric: tabular-nums;
    line-height: 1.3;
  }
  .unit {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--ink-dim);
  }
  .change {
    font-size: 0.8rem;
    color: var(--danger);
  }
  .change.up {
    color: var(--ok);
  }
</style>
