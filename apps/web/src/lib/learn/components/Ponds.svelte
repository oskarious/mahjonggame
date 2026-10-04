<script lang="ts">
  import type { GameState, Seat } from '@mahjong/engine';
  import Pond from '$lib/components/Pond.svelte';
  import { RED } from '@mahjong/drills/position';

  /** The discard rows of the given seats, labelled by where they sit (0 = you). */
  let { state, seats }: { state: GameState; seats: Seat[] } = $props();
  const NAMES = ['Your discards', 'Right', 'Across', 'Left'];
</script>

<div class="ponds">
  {#each seats as s (s)}
    {@const p = state.hand.players[s]}
    <div class="pond">
      <span class="who">{NAMES[s]}{#if p.riichi}<span class="chip bad">Riichi</span>{/if}</span>
      <Pond discards={p.discards} red={RED} perLine={12} last={state.hand.lastDiscard?.seat === s ? state.hand.lastDiscard.tile : null} />
    </div>
  {/each}
</div>

<style>
  .ponds {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .pond {
    --col: 100cqw;
    --tw: min(26px, calc(var(--col, 340px) / 12.5));
    display: flex;
    flex-direction: column;
    /* Centered in the exercise like the hand; rows stay left-aligned inside, as on a table. */
    align-items: center;
    gap: 4px;
  }
  .who {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
    color: var(--ink-dim);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
</style>
