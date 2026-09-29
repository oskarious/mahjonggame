<script lang="ts">
  // Countdown for the player's own decision: a bar that drains over the base time, then over the time bank
  // (gold). Seconds are only shown once the bank is in use. The track is always rendered (hidden when nothing is
  // pending) so the timer never shifts the table layout.
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
    const id = setInterval(() => (now = Date.now()), 100);
    return () => clearInterval(id);
  });
  /** Total time and base time are fixed when the deadline arrives. */
  const start = $derived.by(() => {
    void deadlineAt;
    return Date.now();
  });
  const total = $derived(deadlineAt === null ? 0 : Math.max(0, deadlineAt - start));
  const base = $derived(Math.max(0, total - bank));
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
  const fraction = $derived(inBank ? (bank ? remaining / bank : 0) : base ? (remaining - bank) / base : 0);
</script>

<div class="timer" class:bank={inBank} class:idle={deadlineAt === null} aria-hidden="true">
  <div class="fill" style:width="{Math.max(0, Math.min(1, fraction)) * 100}%"></div>
  {#if inBank}<span class="secs">{Math.ceil(remaining / 1000)}</span>{/if}
</div>

<style>
  .timer {
    position: relative;
    height: 3px;
    margin: 0 8px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.08);
  }
  .timer.idle {
    visibility: hidden;
  }
  .fill {
    height: 100%;
    border-radius: 2px;
    background: var(--ink-dim);
    transition: width 100ms linear;
  }
  .timer.bank .fill {
    background: var(--accent);
  }
  .secs {
    position: absolute;
    right: 0;
    bottom: 5px;
    font-size: 0.7rem;
    font-variant-numeric: tabular-nums;
    color: var(--accent);
  }
</style>
