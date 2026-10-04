<script lang="ts">
  import { setContext } from 'svelte';
  import { kindOf } from '@mahjong/engine';
  import { TILE_MARKS } from '$lib/marks';
  import { describe } from '$lib/learn/text';
  import { RED, tilesOf } from '@mahjong/drills/position';
  import Tile from '$lib/components/Tile.svelte';

  interface Props {
    /** Tile notation; spaces make gaps between groups ("123m 456p 11z"). */
    t: string;
    /** In running text, sized to the line. */
    inline?: boolean;
    /** Largest tile width in px (figures shrink to fit narrow screens). */
    max?: number;
    /** A tile set apart at the end and raised: the winning tile. */
    win?: string;
    caption?: string;
    /** Kinds that are dora in this figure (notation): they, and red fives, glow gold as in a game. */
    dora?: string;
    center?: boolean;
  }
  let { t, inline = false, max = 34, win, caption, dora, center = false }: Props = $props();

  // With `dora`, tiles show the game's dora glow; otherwise figures are plain.
  const plain = $derived(!dora);
  setContext(TILE_MARKS, {
    get dora() {
      return new Set(dora ? tilesOf(dora).map(kindOf) : []);
    },
    focus: null,
  });

  const groups = $derived(t.trim().split(/\s+/).map(tilesOf));
  const winTile = $derived(win ? tilesOf(win)[0] : null);
  /** Slots for sizing: tiles plus a half-tile per gap. */
  const slots = $derived(groups.flat().length + (groups.length - 1) * 0.4 + (winTile !== null ? 1.4 : 0));
  const label = $derived(describe(t) + (win ? `, winning on ${describe(win)}` : ''));
</script>

{#if inline}
  <span class="inline" role="img" aria-label={label}>
    {#each groups as g, i (i)}
      <span class="group">{#each g as tile (tile)}<Tile {tile} red={RED} plain />{/each}</span>
    {/each}
  </span>
{:else}
  <figure class="figure" class:center style:--n={slots} style:--max="{max}px">
    <span class="row" role="img" aria-label={label}>
      {#each groups as g, i (i)}
        <span class="group">{#each g as tile (tile)}<Tile {tile} red={RED} {plain} />{/each}</span>
      {/each}
      {#if winTile !== null}
        <span class="group win"><Tile tile={winTile} red={RED} plain mark="win" /></span>
      {/if}
    </span>
    {#if caption}<figcaption>{caption}</figcaption>{/if}
  </figure>
{/if}

<style>
  .inline {
    --tw: 0.95em;
    display: inline-flex;
    gap: 0.25em;
    vertical-align: -0.55em;
    margin: 0 0.1em;
    line-height: 1;
  }
  .group {
    display: inline-flex;
    gap: 1px;
  }
  .figure {
    margin: 4px 0;
  }
  .row {
    --col: 100cqw;
    /* Minus the 1px gaps between tiles. */
    --tw: min(var(--max), calc(var(--col, 340px) / var(--n) - 1.5px));
    display: flex;
    align-items: flex-end;
    gap: calc(var(--tw) * 0.4);
    padding-top: calc(var(--tw) * 0.3);
  }
  .center .row {
    justify-content: center;
  }
  .center figcaption {
    text-align: center;
  }
  figcaption {
    margin-top: 6px;
    color: var(--ink-dim);
    font-size: 0.85rem;
  }
</style>
