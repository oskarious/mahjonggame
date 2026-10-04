<script lang="ts">
  import { makeMeld, parseTiles } from '@mahjong/engine';
  import Melds from '$lib/components/Melds.svelte';
  import Tile from '$lib/components/Tile.svelte';
  import { RED, meldSlots } from '$lib/learn/position';
  import { describe } from '$lib/learn/text';
  import { sortTiles } from '$lib/tiles';
  import type { YakuExample } from '$lib/learn/yaku';

  /** A yaku list example: concealed tiles, the raised winning tile, then called melds. */
  let { example }: { example: YakuExample } = $props();

  const built = $derived.by(() => {
    const used = new Set<number>();
    const melds = (example.melds ?? []).map(([type, s]) => makeMeld(type, parseTiles(s, used), 3));
    const concealed = parseTiles(example.hand, used);
    const win = concealed[concealed.length - 1];
    return { melds, rest: sortTiles(concealed.slice(0, -1)), win };
  });
  const how = $derived(
    [
      example.ctx?.tsumo ? 'self-draw' : 'ron',
      example.ctx?.riichi === 'double' ? 'double riichi' : example.ctx?.riichi ? 'riichi' : '',
      example.ctx?.dealer ? 'dealer' : '',
    ]
      .filter(Boolean)
      .join(', '),
  );
</script>

<figure class="example" style:--n={built.rest.length + 1.4 + meldSlots(built.melds)}>
  <span class="row" role="img" aria-label="{describe(example.hand)}{example.melds?.length ? ', with called sets' : ''}">
    <span class="group">{#each built.rest as t (t)}<Tile tile={t} red={RED} plain />{/each}</span>
    <span class="group"><Tile tile={built.win} red={RED} plain mark="win" /></span>
    {#if built.melds.length}<Melds melds={built.melds} seat={0} red={RED} />{/if}
  </span>
  <figcaption>{how}</figcaption>
</figure>

<style>
  .example {
    margin: 6px 0 0;
  }
  .row {
    --col: 100cqw;
    /* Minus the 1px gaps between tiles. */
    --tw: min(26px, calc(var(--col, 340px) / var(--n) - 1.5px));
    display: flex;
    align-items: flex-end;
    gap: calc(var(--tw) * 0.4);
    padding-top: calc(var(--tw) * 0.3);
  }
  .group {
    display: flex;
    gap: 1px;
  }
  figcaption {
    color: var(--ink-dim);
    font-size: 0.8rem;
    margin-top: 4px;
  }
</style>
