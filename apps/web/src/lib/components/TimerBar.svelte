<script lang="ts">
  // Countdown for the player's own decision, in whole seconds: the base time in ink with the bank beside it (small,
  // gold), then the bank alone in gold once the base time is used up. Rendered by PlayerArea just below the
  // tile-to-act slot (above the hand), out of flow, so it never shifts the table layout.
  import { sound } from '$lib/audio/player';

  interface Props {
    /** Absolute time the server acts for the player (Date.now based), or null when nothing is pending. */
    deadlineAt: number | null;
    /** Time bank remaining when the deadline was set, ms. */
    bank: number;
  }
  let { deadlineAt, bank }: Props = $props();

  let now = $state(Date.now());
  $effect(() => {
    if (deadlineAt === null) return;
    now = Date.now();
    const id = setInterval(() => (now = Date.now()), 100);
    return () => clearInterval(id);
  });
  const remaining = $derived(deadlineAt === null ? 0 : Math.max(0, deadlineAt - now));
  const inBank = $derived(deadlineAt !== null && remaining <= bank);
  // A tick for each of the last 5 seconds, once per second and deadline; stops when the deadline goes (we acted).
  let warned: { deadline: number; secs: number } | null = null;
  $effect(() => {
    if (deadlineAt === null) return;
    const secs = Math.ceil(remaining / 1000);
    if (secs < 1 || secs > 5) return;
    if (warned && warned.deadline === deadlineAt && warned.secs <= secs) return;
    warned = { deadline: deadlineAt, secs };
    sound().play('timeWarning');
  });
  const mainSecs = $derived(Math.ceil((inBank ? remaining : remaining - bank) / 1000));
  const bankSecs = $derived(inBank ? 0 : Math.ceil(bank / 1000));
</script>

{#if deadlineAt !== null}
  <span class="timer" class:bank={inBank} aria-hidden="true">
    <span class="main">{mainSecs}</span>{#if !inBank}<span class="reserve">{bankSecs}</span>{/if}
  </span>
{/if}

<style>
  /* Centred just below the tile slot (positioned parent), in the space above the hand, out of flow: takes no
     layout space. */
  .timer {
    position: absolute;
    top: 100%;
    left: 50%;
    translate: -50% 2px;
    z-index: 2;
    display: inline-flex;
    align-items: baseline;
    gap: 4px;
    line-height: 1;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    pointer-events: none;
  }
  .main {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--ink);
  }
  .timer.bank .main {
    color: var(--accent);
  }
  .reserve {
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--accent);
  }
</style>
