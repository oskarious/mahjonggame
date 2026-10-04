<script lang="ts">
  import { limitFor, ronPoints, tsumoPoints } from '@mahjong/engine';
  import { LESSON_RULES } from '$lib/learn/position';

  /** The score table, computed from the engine's payment rules (never typed in). */
  let { dealer = false, tsumo = false }: { dealer?: boolean; tsumo?: boolean } = $props();

  const HAN = [1, 2, 3, 4];
  const FU = [20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110];

  function cell(han: number, fu: number): { text: string; limit: boolean } | null {
    // 20 fu exists only for a closed tsumo (pinfu); 25 fu is seven pairs, which is already 2 han (and ron at 2 han).
    if (fu === 20 && !tsumo) return null;
    if (fu === 25 && han < 2) return null;
    if (fu === 25 && tsumo && han < 3) return null;
    if (fu === 20 && han < 2) return null;
    const [limit, base] = limitFor(han, fu, LESSON_RULES);
    let text: string;
    if (!tsumo) text = String(ronPoints(base, dealer));
    else {
      const t = tsumoPoints(base, dealer);
      text = dealer ? `${t.fromOthers} all` : `${t.fromOthers}/${t.fromDealer}`;
    }
    return { text, limit: limit !== 'none' };
  }
</script>

<div class="wrap">
  <table>
    <caption>{dealer ? 'Dealer' : 'Non-dealer'}, {tsumo ? 'tsumo (each player pays)' : 'ron (the discarder pays)'}</caption>
    <thead>
      <tr><th scope="col">Fu</th>{#each HAN as h (h)}<th scope="col">{h} han</th>{/each}</tr>
    </thead>
    <tbody>
      {#each FU as f (f)}
        <tr>
          <th scope="row">{f}</th>
          {#each HAN as h (h)}
            {@const c = cell(h, f)}
            <td class:limit={c?.limit}>{c ? c.text : '–'}</td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .wrap {
    overflow-x: auto;
    margin: 8px 0;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-variant-numeric: tabular-nums;
    font-size: 0.9rem;
  }
  caption {
    text-align: left;
    color: var(--ink-dim);
    font-size: 0.85rem;
    padding-bottom: 6px;
  }
  th,
  td {
    padding: 5px 6px;
    text-align: right;
    border-bottom: 1px solid var(--line);
  }
  thead th {
    color: var(--ink-dim);
    font-weight: 600;
  }
  tbody th {
    text-align: left;
    color: var(--ink-dim);
  }
  td.limit {
    color: var(--accent);
    font-weight: 700;
  }
</style>
