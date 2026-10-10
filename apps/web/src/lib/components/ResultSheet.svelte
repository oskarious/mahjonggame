<script lang="ts">
  import type { HandResult, PlayerView, RedFives } from '@mahjong/engine';
  import { ABORTS, LIMITS, WIND_SHORT, YAKU, YAKUMAN, signed } from '@mahjong/drills/labels';
  import { sortTiles } from '$lib/tiles';
  import Melds from './Melds.svelte';
  import Tile from './Tile.svelte';

  interface Props {
    result: HandResult;
    view: PlayerView;
    names: string[];
    red: RedFives;
    nextLabel: string;
    onnext: () => void;
    /** Confirmed; waiting for the other players before the next deal (online). */
    waiting?: boolean;
  }
  let { result, view, names, red, nextLabel, onnext, waiting = false }: Props = $props();

  const title = $derived.by(() => {
    if (result.type === 'exhaustive') return 'Exhaustive draw';
    if (result.type === 'abortive') return `Abortive draw: ${ABORTS[result.reason]}`;
    return result.wins.length > 1 ? 'Multiple winners' : result.wins[0].from === null ? 'Tsumo' : 'Ron';
  });

  function withoutWinTile(hand: number[], win: number) {
    const i = hand.indexOf(win);
    return sortTiles(i < 0 ? hand : [...hand.slice(0, i), ...hand.slice(i + 1)]);
  }
</script>

<div class="backdrop">
  <div class="sheet" role="dialog" aria-modal="true" aria-label={title}>
    <h2>{title}</h2>

    {#if result.type === 'win'}
      {#each result.wins as w (w.seat)}
        <article class="win">
          <header>
            <strong>{names[w.seat]}</strong>
            <span class="dim">{w.from === null ? 'self-draw' : `from ${names[w.from]}`}</span>
            {#if w.pao !== null}<span class="chip bad">{names[w.pao]} liable</span>{/if}
          </header>
          <div class="tiles">
            <span class="row">
              {#each withoutWinTile(w.hand, w.winTile) as t (t)}<Tile tile={t} {red} />{/each}
              <span class="gap"></span>
              <Tile tile={w.winTile} {red} mark="win" />
            </span>
            <Melds melds={w.melds} seat={w.seat} {red} />
          </div>
          <ul class="yaku">
            {#each w.value.yakuman as y (y.id)}
              <li><span>{YAKUMAN[y.id]}</span><span>Yakuman</span></li>
            {/each}
            {#each w.value.yaku as y (y.id)}
              <li><span>{YAKU[y.id]}</span><span>{y.han}</span></li>
            {/each}
            {#if w.value.dora}<li><span>Dora</span><span>{w.value.dora}</span></li>{/if}
            {#if w.value.redDora}<li><span>Red fives</span><span>{w.value.redDora}</span></li>{/if}
            {#if w.value.uraDora}<li><span>Ura dora</span><span>{w.value.uraDora}</span></li>{/if}
          </ul>
          <p class="total">
            {#if w.value.limit === 'yakuman'}
              Yakuman
            {:else}
              {w.value.han} han{w.value.limit === 'none' || w.value.han < 5 ? ` ${w.value.fu} fu` : ''}
              {LIMITS[w.value.limit] ? `· ${LIMITS[w.value.limit]}` : ''}
            {/if}
          </p>
        </article>
      {/each}
      {#if result.uraIndicators.length}
        <div class="ura">
          <span class="dim">Ura dora indicators</span>
          {#each result.uraIndicators as t (t)}<Tile tile={t} {red} />{/each}
        </div>
      {/if}
    {:else if result.type === 'exhaustive'}
      {#each result.hands as hand, seat (seat)}
        {#if hand}
          <div class="tenpai">
            <strong>{names[seat]}</strong> <span class="chip good">Tenpai</span>
            <span class="row"
              >{#each sortTiles(hand) as t (t)}<Tile tile={t} {red} />{/each}</span
            >
          </div>
        {/if}
      {/each}
      {#if !result.tenpai.some(Boolean)}<p class="dim">Nobody was in tenpai.</p>{/if}
    {/if}

    <table class="deltas">
      <tbody>
        {#each view.players as p (p.seat)}
          <tr class:me={p.seat === view.seat}>
            <td class="wind">{WIND_SHORT[p.seatWind]}</td>
            <td>{names[p.seat]}</td>
            <td class="num" class:up={result.deltas[p.seat] > 0} class:down={result.deltas[p.seat] < 0}>
              {result.deltas[p.seat] ? signed(result.deltas[p.seat]) : ''}
            </td>
            <td class="num">{p.score}</td>
          </tr>
        {/each}
      </tbody>
    </table>

    <button class="btn primary next" class:waiting disabled={waiting} onclick={onnext}
      >{waiting ? 'Waiting…' : nextLabel}</button
    >
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 20;
  }
  .sheet {
    width: min(100%, 520px);
    max-height: 92dvh;
    overflow-y: auto;
    background: var(--panel);
    border-radius: 18px 18px 0 0;
    padding: 16px 14px calc(14px + env(safe-area-inset-bottom));
    display: flex;
    flex-direction: column;
    gap: 12px;
    --tw: min(calc((100vw - 40px) / 15), 26px);
  }
  h2 {
    margin: 0;
    font-size: 1.2rem;
  }
  .win {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--line);
  }
  header {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .dim {
    color: var(--ink-dim);
  }
  .tiles {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 8px;
  }
  .row {
    display: inline-flex;
    align-items: flex-end;
  }
  .gap {
    width: 6px;
  }
  .yaku {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 2px;
  }
  .yaku li {
    display: flex;
    justify-content: space-between;
  }
  .total {
    margin: 0;
    font-weight: 700;
    text-align: right;
  }
  .ura,
  .tenpai {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
  }
  .deltas {
    width: 100%;
    border-collapse: collapse;
    font-variant-numeric: tabular-nums;
  }
  .deltas td {
    padding: 5px 4px;
  }
  .deltas tr.me {
    background: rgba(255, 255, 255, 0.06);
  }
  .wind {
    font-weight: 800;
    width: 1.5em;
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
  .next {
    width: 100%;
  }
</style>
