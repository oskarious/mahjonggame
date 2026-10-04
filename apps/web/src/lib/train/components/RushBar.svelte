<script lang="ts">
  /** A Rush in progress: time left (a bar and seconds), problems solved, and strikes as pips. No labels. */
  let { left, total, score, strikes, max }: { left: number; total: number; score: number; strikes: number; max: number } =
    $props();

  const secs = $derived(Math.ceil(left / 1000));
  const clock = $derived(`${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`);
</script>

<div class="rush" role="status" aria-label="{score} solved, {strikes} of {max} misses, {secs} seconds left">
  <span class="time">{clock}</span>
  <span class="bar"><span class="fill" style:width="{(100 * left) / total}%"></span></span>
  <span class="score">{score}</span>
  <span class="pips">
    {#each { length: max } as _, i (i)}<span class="pip" class:hit={i < strikes}></span>{/each}
  </span>
</div>

<style>
  .rush {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 14px;
    font-variant-numeric: tabular-nums;
    font-weight: 700;
  }
  .time {
    min-width: 2.6em;
  }
  .bar {
    flex: 1;
    height: 8px;
    border-radius: 4px;
    background: var(--panel-2);
    overflow: hidden;
  }
  .fill {
    display: block;
    height: 100%;
    background: var(--accent);
    transition: width 100ms linear;
  }
  .score {
    font-size: 1.4rem;
    min-width: 1.4em;
    text-align: right;
  }
  .pips {
    display: flex;
    gap: 4px;
  }
  .pip {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid var(--ink-dim);
  }
  .pip.hit {
    background: var(--danger);
    border-color: var(--danger);
  }
</style>
