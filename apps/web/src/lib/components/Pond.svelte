<script lang="ts">
  import type { Discard, RedFives, Tile as TileId } from '@mahjong/engine';
  import Tile from './Tile.svelte';

  interface Props {
    discards: Discard[];
    red: RedFives;
    /** Tiles per line. With a multiple of six, groups of six get a small gap (the classic rows). */
    perLine: number;
    /** The discard currently open for claims. */
    claimable?: TileId | null;
  }
  let { discards, red, perLine, claimable = null }: Props = $props();

  // A riichi tile claimed by someone else passes the sideways marker to the next discard.
  const sideways = $derived.by(() => {
    const set = new Set<number>();
    let carry = false;
    discards.forEach((d, i) => {
      if (d.riichi || carry) {
        if (d.calledBy === null) {
          set.add(i);
          carry = false;
        } else carry = true;
      }
    });
    return set;
  });

  const lines = $derived.by(() => {
    const out: number[][] = [];
    for (let i = 0; i < discards.length; i += perLine) {
      out.push(Array.from({ length: Math.min(perLine, discards.length - i) }, (_, j) => i + j));
    }
    return out;
  });
  const grouped = $derived(perLine % 6 === 0);
</script>

<div class="pond">
  {#each lines as line, l (l)}
    <div class="line">
      {#each line as i, j (discards[i].tile)}
        {@const d = discards[i]}
        <span class="slot" class:group-end={grouped && j % 6 === 5 && j < line.length - 1}>
          <Tile
            tile={d.tile}
            {red}
            sideways={sideways.has(i)}
            dim={d.calledBy !== null}
            mark={d.tile === claimable ? 'last' : null}
          />
        </span>
      {/each}
    </div>
  {/each}
</div>

<style>
  .pond {
    display: flex;
    flex-direction: column;
    gap: 3px; /* LINE_GAP in Board */
  }
  .line {
    display: flex;
    align-items: flex-end;
  }
  .slot {
    display: inline-flex;
  }
  .group-end {
    margin-right: calc(var(--tw) * 0.25);
  }
</style>
