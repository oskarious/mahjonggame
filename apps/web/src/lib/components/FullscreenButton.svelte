<script lang="ts">
  import { onMount } from 'svelte';

  // Fullscreen toggle in the top-right corner of every page. Hidden where the Fullscreen API is missing (iPhone Safari,
  // some embedded views); rendered only after mount so SSR and the first client render agree.

  let supported = $state(false);
  let active = $state(false);

  onMount(() => {
    supported = document.fullscreenEnabled === true;
    const sync = () => (active = document.fullscreenElement !== null);
    sync();
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  });

  function toggle() {
    const p = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    p.catch(() => {});
  }
</script>

{#if supported}
  <button class="fs" type="button" onclick={toggle} aria-label={active ? 'Exit full screen' : 'Full screen'}>
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {#if active}
        <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
      {:else}
        <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
      {/if}
    </svg>
  </button>
{/if}

<style>
  .fs {
    position: fixed;
    top: max(4px, env(safe-area-inset-top));
    right: max(4px, env(safe-area-inset-right));
    z-index: 50;
    width: 32px;
    height: 32px;
    padding: 6px;
    border: 0;
    border-radius: 8px;
    background: none;
    color: var(--ink-dim);
    opacity: 0.7;
    cursor: pointer;
  }
  .fs:hover,
  .fs:focus-visible {
    opacity: 1;
    background: var(--panel-2);
  }
  svg {
    width: 100%;
    height: 100%;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>
