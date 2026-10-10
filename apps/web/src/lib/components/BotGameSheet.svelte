<script lang="ts">
  import { goto } from '$app/navigation';
  import { BOT_PRESETS, DEFAULT_BOT_ELO } from '$lib/bots';
  import type { SavedGame } from '$lib/game/saved';
  import { WINDS } from '@mahjong/drills/labels';

  /** The offline game's settings, in a bottom sheet from the home page: start a new game, or continue the saved one. */
  let { saved, onclose }: { saved: SavedGame | null; onclose: () => void } = $props();

  let preset = $state('default');
  let length = $state('east');
  let bots = $state(DEFAULT_BOT_ELO);
  let hints = $state('distance');

  function start(e: SubmitEvent) {
    e.preventDefault();
    goto(`/play?${new URLSearchParams({ preset, length, bots: String(bots), hints })}`);
  }

  const focus = (el: HTMLElement) => el.focus();
</script>

<div class="backdrop" onclick={onclose} role="presentation">
  <div
    class="panel"
    role="dialog"
    aria-modal="true"
    aria-label="Play vs bots"
    tabindex="-1"
    use:focus
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.key === 'Escape' && onclose()}
  >
    <form onsubmit={start}>
      <h2>Play vs bots</h2>

      <fieldset>
        <legend>Length</legend>
        <div class="seg">
          <label class:on={length === 'east'}><input type="radio" bind:group={length} value="east" />East only</label>
          <label class:on={length === 'south'}><input type="radio" bind:group={length} value="south" />East + South</label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Rules</legend>
        <div class="seg">
          <label class:on={preset === 'default'}><input type="radio" bind:group={preset} value="default" />Online</label>
          <label class:on={preset === 'ema'}><input type="radio" bind:group={preset} value="ema" />EMA 2025</label>
        </div>
      </fieldset>

      <fieldset>
        <legend>Opponents</legend>
        <div class="seg elo">
          {#each BOT_PRESETS as elo (elo)}
            <label class:on={bots === elo}><input type="radio" bind:group={bots} value={elo} />{elo}</label>
          {/each}
        </div>
      </fieldset>

      <fieldset>
        <legend>Hints</legend>
        <select bind:value={hints}>
          <option value="off">Off</option>
          <option value="distance">Distance ("3 away")</option>
          <option value="full">+ Discard advice</option>
        </select>
      </fieldset>

      <div class="start">
        {#if saved}
          <a class="btn big primary" href="/play">
            <span>Continue</span>
            <span class="round">{WINDS[saved.round.wind]} {saved.round.dealer + 1}</span>
          </a>
        {/if}
        <button class="btn big" class:primary={!saved} type="submit">{saved ? 'New game' : 'Start'}</button>
      </div>
    </form>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    z-index: 40;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }
  .panel {
    width: min(100%, 520px);
    max-height: 92dvh;
    overflow-y: auto;
    background: var(--panel);
    border-radius: 18px 18px 0 0;
    padding: 16px 14px calc(14px + env(safe-area-inset-bottom));
    outline: none;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  h2 {
    margin: 0;
    font-size: 1.2rem;
  }
  fieldset {
    border: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  legend {
    font-size: 0.8rem;
    color: var(--ink-dim);
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .seg.elo {
    grid-template-columns: repeat(5, 1fr);
    font-variant-numeric: tabular-nums;
  }
  .start {
    display: flex;
    gap: 8px;
  }
  .big {
    flex: 1;
    min-height: 56px;
    font-size: 1.15rem;
    text-decoration: none;
  }
  .round {
    font-size: 0.85rem;
    font-weight: 600;
    opacity: 0.75;
    font-variant-numeric: tabular-nums;
  }
</style>
