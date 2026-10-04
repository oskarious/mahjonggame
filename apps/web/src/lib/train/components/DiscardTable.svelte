<script lang="ts">
  import type { Kind } from '@mahjong/engine';
  import Tile from '$lib/components/Tile.svelte';
  import { discardAnswers, discardOptions, stateOf } from '$lib/learn/goals';
  import { RED } from '$lib/learn/position';
  import type { ExerciseOf } from '$lib/learn/types';

  /**
   * Every distinct discard, best first: tiles away after it, how many tiles then improve the hand (or win it, at
   * tenpai) and which. The best rows are gold-edged, the reader's discards marked with a dot.
   */
  let { exercise, discarded }: { exercise: ExerciseOf<'discard'>; discarded: Kind[] } = $props();

  const g = $derived(stateOf(exercise)!);
  const rows = $derived(discardOptions(g));
  const best = $derived(discardAnswers(exercise, g));
  const tried = $derived(new Set(discarded));
</script>

<table class="discards">
  <tbody>
    {#each rows as o (o.kind)}
      {@const keeps = o.tenpai ? o.waits : o.ukeire}
      <tr class:best={best.has(o.kind)} class:tried={tried.has(o.kind)}>
        <td class="tile" aria-label={tried.has(o.kind) ? 'Your discard' : undefined}>
          <span class="dot" aria-hidden="true"></span><Tile tile={o.kind * 4 + 1} red={RED} plain />
        </td>
        <td class="away">{o.shanten === 0 ? 'Tenpai' : `${o.shanten} away`}</td>
        <td class="n">{o.total}</td>
        <td>
          <span class="keeps">{#each keeps as t (t.kind)}<Tile tile={t.kind * 4 + 1} red={RED} plain />{/each}</span>
        </td>
      </tr>
    {/each}
  </tbody>
</table>

<style>
  .discards {
    --tw: 15px;
    width: 100%;
    border-collapse: separate;
    border-spacing: 0 3px;
    font-variant-numeric: tabular-nums;
    font-size: 0.85rem;
  }
  td {
    padding: 3px 4px;
    vertical-align: middle;
    background: var(--panel);
  }
  td:first-child {
    border-radius: 8px 0 0 8px;
  }
  td:last-child {
    border-radius: 0 8px 8px 0;
  }
  .best td {
    background: color-mix(in srgb, var(--accent) 22%, var(--panel));
  }
  .tile {
    --tw: 18px;
    width: 34px;
    white-space: nowrap;
  }
  .dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    margin-right: 4px;
    border-radius: 50%;
    vertical-align: middle;
  }
  .tried .dot {
    background: var(--ink);
  }
  .away {
    color: var(--ink-dim);
    white-space: nowrap;
  }
  .n {
    font-weight: 700;
    text-align: right;
    width: 2.2em;
  }
  .keeps {
    display: flex;
    flex-wrap: wrap;
    gap: 1px;
  }
</style>
