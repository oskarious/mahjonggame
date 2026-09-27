<script lang="ts">
  import type { Meld, RedFives, Seat } from '@mahjong/engine';
  import Tile from './Tile.svelte';

  interface Props {
    melds: Meld[];
    /** Seat that owns the melds, to rotate the claimed tile towards the discarder. */
    seat: Seat;
    red: RedFives;
  }
  let { melds, seat, red }: Props = $props();

  /** Tiles in display order with the claimed tile turned sideways (left / middle / right by discarder). */
  function layout(m: Meld, owner: Seat) {
    if (m.type === 'ankan') {
      return m.tiles.map((tile, i) => ({ tile, sideways: false, back: i === 0 || i === 3 }));
    }
    const rel = ((m.from ?? owner) - owner + 4) % 4; // 1 right, 2 across, 3 left
    const own = m.tiles.filter((t) => t !== m.called && t !== m.added);
    const called = { tile: m.called!, sideways: true, back: false };
    const plain = own.map((tile) => ({ tile, sideways: false, back: false }));
    const pos = rel === 3 ? 0 : rel === 2 ? 1 : plain.length;
    plain.splice(pos, 0, called);
    if (m.added !== undefined) plain.splice(pos + 1, 0, { tile: m.added, sideways: true, back: false });
    return plain;
  }
</script>

<div class="melds">
  {#each melds as m, i (i)}
    <span class="meld">
      {#each layout(m, seat) as t (t.tile)}
        <Tile tile={t.tile} {red} sideways={t.sideways} back={t.back} />
      {/each}
    </span>
  {/each}
</div>

<style>
  .melds {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: calc(var(--tw, 20px) * 0.3);
  }

  .meld {
    display: inline-flex;
    align-items: flex-end;
  }
</style>
