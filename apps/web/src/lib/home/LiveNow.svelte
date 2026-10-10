<script lang="ts">
  /** How many are seated in running games. Hidden when nobody is playing. */
  let { players }: { players: number } = $props();
</script>

{#if players}
  <p class="live">
    <span class="dot" aria-hidden="true"></span>
    <b>{players}</b> playing
  </p>
{/if}

<style>
  .live {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin: 10px 0 !important;
    color: var(--ink-dim);
    font-size: 0.9rem;
    font-variant-numeric: tabular-nums;
  }
  b {
    color: var(--ink);
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--ok);
  }
</style>
