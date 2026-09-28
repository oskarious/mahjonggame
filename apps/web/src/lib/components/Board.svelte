<script lang="ts">
  import {
    type Meld,
    type PlayerView,
    type RedFives,
    type Tile as TileId,
  } from '@mahjong/engine';
  import { WIND_SHORT } from '$lib/labels';
  import { sortTiles } from '$lib/tiles';
  import Melds from './Melds.svelte';
  import Pond from './Pond.svelte';
  import Tile from './Tile.svelte';

  interface Props {
    view: PlayerView;
    names: string[];
    red: RedFives;
    /** Debug: every seat's concealed tiles. */
    revealed?: TileId[][] | null;
  }
  let { view, names, red, revealed = null }: Props = $props();

  // Turn order from the player after me down to me: right, across, left (the only chii source) and me.
  const rows = $derived([1, 2, 3, 0].map((rel) => ({ rel, seat: (view.seat + rel) % 4 })));
  const POS = ['you', 'right', 'across', 'left'];
  const active = $derived(view.turn ?? view.claimable?.seat ?? null);

  // --- Sizing: fill the available space, sized so a long pond still fits its row. ---
  /**
   * Discards each row is sized for. Most hands end before 18 discards; if a pond grows past that,
   * everything shrinks once to make room (rather than sizing every hand for the rare long one).
   */
  const MIN_CAPACITY = 18;
  const capacity = $derived(Math.max(MIN_CAPACITY, ...view.players.map((p) => p.discards.length)));
  // Must match the CSS below: seat padding/border, the gap under the melds line, the info column.
  const ROW_GAP = 4;
  const SEAT_CHROME_V = 12 + 3;
  const SEAT_CHROME_H = 69;
  const LINE_GAP = 3;
  /** Open sets are drawn at this fraction of a discard tile, on their own line above the discards. */
  const MELD_SCALE = 0.8;

  let rowsEl: HTMLDivElement | undefined = $state();
  let box = $state({ w: 0, h: 0 });

  $effect(() => {
    if (!rowsEl) return;
    // Measure right away too: ResizeObserver callbacks only run when the page renders, so a
    // backgrounded tab would otherwise stay at the fallback size.
    const r = rowsEl.getBoundingClientRect();
    box = { w: r.width, h: r.height };
    const ro = new ResizeObserver(([entry]) => {
      box = { w: entry.contentRect.width, h: entry.contentRect.height };
    });
    ro.observe(rowsEl);
    return () => ro.disconnect();
  });

  /** Largest tile width (and tiles per line) that fits `capacity` discards in a quarter of the space. */
  function fit(w: number, h: number, capacity: number) {
    const rowH = (h - 3 * ROW_GAP) / 4 - SEAT_CHROME_V - 2;
    const pondW = w - SEAT_CHROME_H;
    let best = { tw: 14, perLine: 12 };
    if (rowH <= 0 || pondW <= 0) return best;
    for (let perLine = 6; perLine <= 14; perLine++) {
      const lines = Math.ceil(capacity / perLine);
      // Room for a sideways riichi tile and the gaps between groups of six.
      const groups = perLine % 6 === 0 ? perLine / 6 - 1 : 0;
      const byWidth = pondW / (perLine + 0.34 + groups * 0.25);
      // Discard lines plus the melds line (MELD_SCALE tall) share the row height.
      const byHeight = (rowH - (lines - 1) * LINE_GAP) / (lines + MELD_SCALE) / (4 / 3);
      const tw = Math.floor(Math.min(byWidth, byHeight, 44) * 2) / 2;
      // Prefer the classic rows of six when the size is about the same.
      const better = tw > best.tw + 1 || (tw >= best.tw - 1 && perLine % 6 === 0 && best.perLine % 6 !== 0);
      if (better) best = { tw, perLine };
    }
    return best;
  }
  const layout = $derived(fit(box.w, box.h, capacity));
  const meldTw = $derived(Math.floor(layout.tw * MELD_SCALE * 2) / 2);

  /** Width of a row of melds in tile widths: sideways tiles are 4/3 wide, plus a small gap per set. */
  function meldUnits(melds: Meld[]): number {
    let units = 0;
    for (const m of melds) {
      const sideways = m.type === 'ankan' ? 0 : m.type === 'shouminkan' ? 2 : 1;
      units += m.tiles.length + sideways / 3 + 0.3;
    }
    return units;
  }
  /** Many sets in one row shrink just enough to fit the width. */
  function meldSize(melds: Meld[]): number {
    const units = meldUnits(melds);
    if (!units) return meldTw;
    return Math.min(meldTw, Math.floor(((box.w - SEAT_CHROME_H) / units) * 2) / 2);
  }
</script>

<div class="board">
  <div class="rows" bind:this={rowsEl} style:--tw="{layout.tw}px" style:--meld-tw="{meldTw}px">
    {#each rows as { rel, seat } (seat)}
      {@const p = view.players[seat]}
      <section class="seat" class:me={rel === 0} class:active={active === seat} aria-label="{names[seat]}, {POS[rel]}">
        <div class="info">
          <span class="name">{names[seat]}</span>
          <span class="wind" class:dealer={p.seatWind === 0}>{WIND_SHORT[p.seatWind]}</span>
          <span class="score">{p.score}</span>
          {#if p.riichi}<span class="stick" title="Riichi"></span>{/if}
        </div>
        <div class="main">
          <div class="top" style:--tw="{meldSize(p.melds)}px">
            {#if revealed && rel !== 0}
              <span class="hidden-hand">
                {#each sortTiles(revealed[seat]) as t (t)}<Tile tile={t} {red} />{/each}
              </span>
            {/if}
            <span class="melds"><Melds melds={p.melds} {seat} {red} /></span>
          </div>
          <Pond
            discards={p.discards}
            {red}
            perLine={layout.perLine}
            claimable={view.claimable?.seat === seat ? view.claimable.tile : null}
          />
        </div>
      </section>
    {/each}
  </div>
</div>

<style>
  .board {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 0 6px;
  }

  /* Four equal rows filling the space between the header and the own hand. */
  .rows {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 4px; /* ROW_GAP */
  }

  .seat {
    flex: 1 1 0;
    min-height: 0;
    overflow: hidden;
    display: grid;
    grid-template-columns: 50px 1fr;
    gap: 6px;
    padding: 4px 6px 5px 4px;
    border-radius: 10px;
    background: var(--surface);
    border: 1.5px solid transparent;
  }
  .seat.me {
    background: var(--surface-me);
  }
  .seat.active {
    border-color: var(--accent);
  }

  .info {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    font-variant-numeric: tabular-nums;
  }
  .wind {
    font-size: 1.35rem;
    font-weight: 800;
    line-height: 1;
  }
  .wind.dealer {
    color: var(--danger);
  }
  .score {
    font-size: 0.72rem;
    color: var(--ink-dim);
  }
  .stick {
    width: 26px;
    height: 5px;
    border-radius: 3px;
    background: #fff;
    position: relative;
  }
  .stick::after {
    content: '';
    position: absolute;
    left: 50%;
    top: 50%;
    width: 4px;
    height: 4px;
    translate: -50% -50%;
    border-radius: 50%;
    background: #d22;
  }

  .main {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }
  /* Open sets (and the debug hand) on their own line, sized from the discards. */
  .top {
    display: flex;
    align-items: flex-end;
    gap: 6px;
    height: calc(var(--meld-tw) * 4 / 3 + 2px);
  }
  .name {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--ink-dim);
  }
  .hidden-hand {
    display: flex;
    opacity: 0.85;
    --tw: min(var(--meld-tw), 14px);
  }
  .melds {
    margin-left: auto;
  }
</style>
