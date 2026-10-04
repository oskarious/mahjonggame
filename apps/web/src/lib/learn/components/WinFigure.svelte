<script lang="ts">
  import { type GameState, doraFromIndicator, kindOf } from '@mahjong/engine';
  import Melds from '$lib/components/Melds.svelte';
  import Tile from '$lib/components/Tile.svelte';
  import { WINDS } from '$lib/labels';
  import { RED, meldSlots, winSpot } from '$lib/learn/position';
  import type { Show } from '$lib/learn/types';
  import { sortTiles } from '$lib/tiles';

  /**
   * Seat 0's hand with the tile it may win on, how it wins (and riichi, when in riichi), plus the facts the exercise
   * asks for: seat, round, dora, counters.
   */
  let { state, show = {} }: { state: GameState; show?: Show } = $props();

  const spot = $derived(winSpot(state));
  const me = $derived(state.hand.players[0]);
  const SIDES = ['', 'right', 'across', 'left'];
  const seatWind = $derived(WINDS[(0 - state.dealer + 4) % 4]);
  const indicators = $derived(state.hand.doraIndicators.slice(0, state.hand.doraRevealed));
</script>

<div class="win-figure">
  <div class="hand" style:--n={spot.concealed.length + 1.4 + meldSlots(spot.melds)}>
    <span class="tiles">
      {#each sortTiles(spot.concealed) as t (t)}<Tile tile={t} red={RED} />{/each}
    </span>
    <span class="win"><Tile tile={spot.tile} red={RED} mark="win" /></span>
    {#if spot.melds.length}<span class="melds"><Melds melds={spot.melds} seat={0} red={RED} /></span>{/if}
  </div>
  <div class="facts">
    <span class="chip gold">{spot.by === 'tsumo' ? 'Tsumo' : `Ron from ${SIDES[spot.from!]}`}</span>
    {#if show.seat}<span class="chip">Seat {seatWind}{state.dealer === 0 ? ' (dealer)' : ''}</span>{/if}
    {#if show.round}<span class="chip">Round {WINDS[state.roundWind]}</span>{/if}
    {#if me.riichi}<span class="chip">Riichi</span>{/if}
    {#if show.counters}
      <span class="chip">{state.honba} honba · {state.riichiSticks} riichi {state.riichiSticks === 1 ? 'stick' : 'sticks'}</span>
    {/if}
    {#if show.dora}
      <span class="chip dora">
        Dora
        {#each indicators as t (t)}
          <Tile tile={t} red={RED} plain />→<Tile tile={doraFromIndicator(kindOf(t)) * 4 + 1} red={RED} plain />
        {/each}
      </span>
    {/if}
  </div>
</div>

<style>
  .win-figure {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .hand {
    --col: 100cqw;
    /* Minus the 1px gaps between tiles. */
    --tw: min(34px, calc(var(--col, 340px) / var(--n) - 1.5px));
    display: flex;
    align-items: flex-end;
    gap: calc(var(--tw) * 0.4);
    padding-top: calc(var(--tw) * 0.3);
  }
  .tiles {
    display: flex;
    gap: 1px;
  }
  .melds :global(.melds) {
    --tw: inherit;
  }
  .facts {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .dora {
    --tw: 14px;
    gap: 3px;
  }
</style>
