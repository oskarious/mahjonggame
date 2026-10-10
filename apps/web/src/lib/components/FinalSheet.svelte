<script lang="ts">
  import type { FinalStanding } from '@mahjong/engine';
  import type { RatingChange } from '@mahjong/protocol';
  import { signed } from '@mahjong/drills/labels';
  import RankBadge from './RankBadge.svelte';

  interface Props {
    final: FinalStanding[];
    names: string[];
    me: number;
    /** Online: rating changes of every rated seat. */
    ratings?: RatingChange[] | null;
    onagain: () => void;
    onhome: () => void;
  }
  let { final, names, me, ratings = null, onagain, onhome }: Props = $props();
  const change = (seat: number) => ratings?.find((r) => r.seat === seat) ?? null;
  const mine = $derived(final.find((f) => f.seat === me)!);
  const ORD = ['1st', '2nd', '3rd', '4th'];
</script>

<div class="backdrop">
  <div class="sheet" role="dialog" aria-modal="true" aria-label="Game over">
    <h2>{ORD[mine.rank - 1]} place</h2>
    <table>
      <thead>
        <tr
          ><th></th><th>Player</th><th class="num">Points</th><th class="num">Result</th>{#if ratings}<th class="num"
              >Rating</th
            >{/if}</tr
        >
      </thead>
      <tbody>
        {#each final as f (f.seat)}
          <tr class:me={f.seat === me}>
            <td>{ORD[f.rank - 1]}</td>
            <td>{names[f.seat]}</td>
            <td class="num">{f.points}</td>
            <td class="num" class:up={f.score > 0} class:down={f.score < 0}>{signed(f.score)}</td>
            {#if ratings}
              {@const r = change(f.seat)}
              <td class="num rating">
                {#if r}<span class:up={r.after > r.before} class:down={r.after < r.before}
                    >{signed(r.after - r.before)}</span
                  >
                  → <RankBadge rating={r.after} />{/if}
              </td>
            {/if}
          </tr>
        {/each}
      </tbody>
    </table>
    <div class="buttons">
      <button class="btn ghost" onclick={onhome}>Home</button>
      <button class="btn primary" onclick={onagain}>Play again</button>
    </div>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 30;
    padding: 16px;
  }
  .sheet {
    width: min(100%, 420px);
    background: var(--panel);
    border-radius: 18px;
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  h2 {
    margin: 0;
    text-align: center;
    font-size: 1.5rem;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-variant-numeric: tabular-nums;
  }
  th {
    text-align: left;
    font-weight: 500;
    color: var(--ink-dim);
    font-size: 0.8rem;
  }
  td,
  th {
    padding: 6px 4px;
  }
  tr.me {
    background: rgba(255, 255, 255, 0.07);
  }
  .num {
    text-align: right;
  }
  .up {
    color: var(--ok);
  }
  .down {
    color: var(--danger);
  }
  .rating {
    white-space: nowrap;
  }
  .buttons {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 8px;
  }
</style>
