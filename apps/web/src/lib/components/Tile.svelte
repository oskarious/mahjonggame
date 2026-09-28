<script lang="ts">
  import { getContext } from 'svelte';
  import { isRedTile, kindOf, type RedFives, type Tile } from '@mahjong/engine';
  import { TILE_MARKS, type TileMarks } from '$lib/marks';
  import { kindIndex, kindName, tileImage } from '$lib/tiles';

  interface Props {
    tile?: Tile | null;
    red: RedFives;
    /** Face down. */
    back?: boolean;
    /** Rotated 90° (called tiles, riichi discard). */
    sideways?: boolean;
    selected?: boolean;
    /** Greyed out (not playable, or claimed by another player). */
    dim?: boolean;
    /** Emphasis: raised (last discard, winning tile) or a dot (suggested discard). */
    mark?: 'last' | 'hint' | 'win' | null;
    /** Skip the board-wide dora / same-tile markings (icons, previews, the magnifier). */
    plain?: boolean;
    /** Own hand: a larger corner index (largest below 32 px) so small tiles stay readable. */
    compact?: boolean;
    onclick?: (e: MouseEvent) => void;
  }

  let {
    tile = null,
    red,
    back = false,
    sideways = false,
    selected = false,
    dim = false,
    mark = null,
    plain = false,
    compact = false,
    onclick,
  }: Props = $props();
  const marks = getContext<TileMarks | undefined>(TILE_MARKS);
  const label = $derived(back || tile === null ? 'Hidden tile' : kindName(kindOf(tile)));
  // The white dragon artwork is blank; draw the common blue frame so it doesn't look missing.
  const haku = $derived(!back && tile !== null && kindOf(tile) === 31);
  const index = $derived(back || tile === null ? null : kindIndex(kindOf(tile)));
  const redFive = $derived(!back && tile !== null && isRedTile(tile, red));
  const kind = $derived(back || tile === null ? null : kindOf(tile));
  const dora = $derived(!plain && kind !== null && (redFive || !!marks?.dora.has(kind)));
  const focused = $derived(!plain && kind !== null && marks?.focus === kind);
  /** Blue: matches the tile being looked at (wins while looking). Gold: dora. */
  const glow = $derived(focused ? 'blue' : dora ? 'gold' : null);
</script>

{#snippet face()}
  {#if back || tile === null}
    <span class="back"></span>
  {:else}
    <img src={tileImage(tile, red)} alt="" draggable="false" />
    {#if glow}<span class="tint {glow}" aria-hidden="true"></span>{/if}
    <span class="index {index!.suit}" class:red-five={redFive} class:wide={index!.text.length > 1} aria-hidden="true"
      >{index!.text}</span
    >
  {/if}
{/snippet}

{#if onclick}
  <button
    type="button"
    class="tile {mark ?? ''} {glow ? `glow-${glow}` : ''}"
    class:sideways
    class:haku
    class:selected
    class:dim
    class:focused
    class:compact
    aria-label={dora ? `${label}, dora` : label}
    aria-pressed={selected}
    {onclick}
  >
    <span class="face">{@render face()}</span>
  </button>
{:else}
  <span
    class="tile {mark ?? ''} {glow ? `glow-${glow}` : ''}"
    class:sideways
    class:haku
    class:dim
    class:focused
    class:compact
    role="img"
    aria-label={dora ? `${label}, dora` : label}
  >
    <span class="face">{@render face()}</span>
  </span>
{/if}

<style>
  .tile {
    --w: var(--tw, 28px);
    --h: calc(var(--w) * 4 / 3);
    position: relative;
    display: inline-block;
    flex: none;
    width: var(--w);
    height: var(--h);
    transition: transform 90ms ease-out;
  }

  .tile.sideways {
    width: var(--h);
    height: var(--w);
    align-self: flex-end;
  }

  .face {
    position: absolute;
    left: 50%;
    top: 50%;
    width: var(--w);
    height: var(--h);
    translate: -50% -50%;
    border-radius: calc(var(--w) * 0.14);
    background: var(--tile-face);
    box-shadow:
      0 calc(var(--w) * 0.08) 0 var(--tile-edge),
      0 calc(var(--w) * 0.1) calc(var(--w) * 0.12) rgba(0, 0, 0, 0.35);
    overflow: hidden;
  }

  .sideways .face {
    rotate: 90deg;
    box-shadow:
      calc(var(--w) * -0.08) 0 0 var(--tile-edge),
      calc(var(--w) * -0.1) 0 calc(var(--w) * 0.12) rgba(0, 0, 0, 0.35);
  }

  img {
    position: absolute;
    inset: 7% 8%;
    width: 84%;
    height: 86%;
    object-fit: contain;
    user-select: none;
    pointer-events: none;
  }

  /* Corner index. Hidden on tiny tiles, and when the page opts out with body.no-tile-labels. */
  .face {
    container-type: inline-size;
  }
  @container (max-width: 15.9px) {
    .index {
      display: none;
    }
  }
  .index {
    position: absolute;
    left: 4%;
    top: 2%;
    z-index: 1;
    font: 800 max(calc(var(--w) * 0.34), 7px) / 1 system-ui, sans-serif;
    letter-spacing: -0.04em;
    padding: 0 calc(var(--w) * 0.04);
    border-radius: calc(var(--w) * 0.06);
    background: rgba(251, 250, 244, 0.88);
    pointer-events: none;
  }
  .index.man {
    color: #b3261e;
  }
  .index.pin {
    color: #1f4fa3;
  }
  .index.sou {
    color: #1d7a3a;
  }
  .index.honor {
    color: #1b1b1b;
  }
  .index.red-five {
    color: #fff;
    background: #d0342c;
  }
  :global(body.no-tile-labels) .index {
    display: none;
  }

  /* Own-hand tiles (compact prop): a bigger corner index than the board, biggest on small tiles.
     cqw, not var(--w): a --w holding cqw units would re-resolve against .face (a container) here. */
  .tile.compact .index {
    font-size: max(40cqw, 7px);
  }
  .tile.compact .index.wide {
    font-size: max(30cqw, 7px);
  }
  @container (max-width: 31.9px) {
    .tile.compact .index {
      font-size: max(48cqw, 9px);
    }
    .tile.compact .index.wide {
      font-size: max(36cqw, 9px);
    }
  }

  /* Same kind as the tile the player is looking at. */
  /* Glow: a tint over the artwork plus a soft halo around the tile. */
  .tint {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  .tint.blue {
    background: rgba(76, 195, 255, 0.38);
  }
  .tint.gold {
    background: rgba(242, 183, 5, 0.38);
  }
  .glow-blue .face {
    box-shadow:
      0 0 calc(var(--w) * 0.4) rgba(76, 195, 255, 0.95),
      0 calc(var(--w) * 0.08) 0 #8fcde8;
  }
  .glow-gold .face {
    box-shadow:
      0 0 calc(var(--w) * 0.4) rgba(242, 183, 5, 0.95),
      0 calc(var(--w) * 0.08) 0 #e0c46a;
  }
  /* A claimed (greyed) discard still lights up when it matches. Not in the own hand (compact): there dim means
     "can't discard this now" (e.g. riichi mode) and must win over the glow. */
  .glow-blue.dim:not(.compact) .face,
  .glow-gold.dim:not(.compact) .face {
    filter: none;
  }
  .index {
    z-index: 2;
  }
  /* Keep the corner label upright on sideways tiles (claimed tiles, riichi discards). */
  .sideways .index {
    rotate: -90deg;
  }

  /* Last discard and winning tile: raised off the row, colour-neutral so it never clashes with a glow. */
  .last,
  .win {
    transform: translateY(calc(var(--w) * -0.18));
  }
  .last .face,
  .win .face {
    filter: drop-shadow(0 calc(var(--w) * 0.18) calc(var(--w) * 0.12) rgba(0, 0, 0, 0.7));
  }

  .haku .face::before {
    content: '';
    position: absolute;
    inset: 20% 22%;
    border: calc(var(--w) * 0.08) solid #3d6fb3;
    border-radius: calc(var(--w) * 0.06);
  }

  .back {
    position: absolute;
    inset: 0;
    background: linear-gradient(160deg, #3a86ab, var(--tile-back));
  }

  button.tile:not(:disabled):hover .face {
    filter: brightness(1.04);
  }

  .selected {
    transform: translateY(calc(var(--w) * -0.35));
  }

  .dim .face {
    filter: brightness(0.6) saturate(0.6);
  }

  .hint .face::after {
    content: '';
    position: absolute;
    left: 50%;
    bottom: 5%;
    width: 18%;
    aspect-ratio: 1;
    translate: -50% 0;
    border-radius: 50%;
    background: #3aa85a;
  }

</style>
