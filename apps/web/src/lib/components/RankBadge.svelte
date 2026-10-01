<script lang="ts">
  // A rating with its rank icon to the right: the only place ratings and ranks are drawn. The sub-rank icon (see
  // lib/ranks.ts) is tinted with the rank's colours; without one, a chip with the label. The number takes the
  // surrounding text style.
  import { rankForRating } from '@mahjong/protocol';
  import { RANK_ICONS } from '$lib/ranks';

  interface Props {
    rating: number;
    /** Icon edge as a CSS length; relative to the text by default. */
    size?: string;
    /** On a dark pill, for light backgrounds (e.g. a primary button) where the pale ranks would vanish. */
    pill?: boolean;
  }
  let { rating, size = '1.6em', pill = false }: Props = $props();

  const info = $derived(rankForRating(rating));
  const icon = $derived(RANK_ICONS[info.sub]);
</script>

<span
  class="rank"
  class:pill
  title={info.label}
  data-rank={info.rank.id}
  style:--size={size}
  style:--rank-light={info.rank.colors.light}
  style:--rank-mid={info.rank.colors.mid}
  style:--rank-dark={info.rank.colors.dark}
>
  <span class="num">{rating}</span>
  {#if icon}
    <!-- Build-time asset from lib/assets/ranks, not user input. -->
    <span class="icon" role="img" aria-label={info.label}>{@html icon}</span>
  {:else}
    <span class="chip">{info.label}</span>
  {/if}
</span>

<style>
  .rank {
    display: inline-flex;
    align-items: center;
    gap: 0.15em;
    line-height: 1;
    vertical-align: middle;
    white-space: nowrap;
  }
  .pill {
    gap: 0.3em;
    padding: 0.25em 0.45em 0.25em 0.65em;
    border-radius: 999px;
    background: var(--panel);
    color: var(--ink);
  }
  .pill .icon {
    margin: 0;
  }
  .icon {
    display: inline-flex;
    width: var(--size);
    height: var(--size);
    margin: calc(var(--size) * -0.15) 0;
  }
  .icon :global(svg) {
    width: 100%;
    height: 100%;
  }
  .num {
    font-variant-numeric: tabular-nums;
  }
  .chip {
    padding: 0.15em 0.5em;
    border-radius: 999px;
    background: var(--panel);
    border: 1px solid var(--line);
    font-size: 0.75em;
    font-weight: 600;
    color: var(--ink-dim);
  }
</style>
