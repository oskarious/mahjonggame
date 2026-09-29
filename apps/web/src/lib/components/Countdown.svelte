<script lang="ts">
  // The countdown before play after a deal (online): one large number over the board, gone at zero.
  interface Props {
    /** Absolute time (Date.now based) at which play starts, or null. */
    until: number | null;
  }
  let { until }: Props = $props();

  let now = $state(Date.now());
  $effect(() => {
    if (until === null) return;
    now = Date.now();
    const id = setInterval(() => (now = Date.now()), 100);
    return () => clearInterval(id);
  });
  const secs = $derived(until === null ? 0 : Math.ceil((until - now) / 1000));
</script>

{#if secs > 0}
  <div class="countdown" aria-live="polite">
    {#key secs}<span>{secs}</span>{/key}
  </div>
{/if}

<style>
  .countdown {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    pointer-events: none;
    z-index: 5;
  }
  span {
    display: grid;
    place-items: center;
    width: 96px;
    height: 96px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--panel) 85%, transparent);
    border: 2px solid var(--accent);
    color: var(--accent);
    font-size: 3rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
    animation: pop 0.25s ease-out;
  }
  @keyframes pop {
    from {
      transform: scale(1.25);
      opacity: 0.4;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    span {
      animation: none;
    }
  }
</style>
