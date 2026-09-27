<script lang="ts">
  import { type PlayerView, type RedFives, type Tile as TileId, doraFromIndicator, kindOf } from '@mahjong/engine';
  import { WIND_SHORT, WINDS } from '$lib/labels';
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
  // Must match the CSS below: seat padding/border/header and the info column.
  const ROW_GAP = 4;
  const SEAT_CHROME_V = 12 + 22 + 3;
  const SEAT_CHROME_H = 63;
  const LINE_GAP = 3;

  let rowsEl: HTMLDivElement | undefined = $state();
  let box = $state({ w: 0, h: 0 });

  $effect(() => {
    if (!rowsEl) return;
    const ro = new ResizeObserver(([entry]) => {
      box = { w: entry.contentRect.width, h: entry.contentRect.height };
    });
    ro.observe(rowsEl);
    return () => ro.disconnect();
  });

  /** Largest tile width (and tiles per line) that fits `capacity` discards in a quarter of the space. */
  function fit(w: number, h: number, capacity: number) {
    const rowH = (h - 3 * ROW_GAP) / 4 - SEAT_CHROME_V;
    const pondW = w - SEAT_CHROME_H;
    let best = { tw: 14, perLine: 12 };
    if (rowH <= 0 || pondW <= 0) return best;
    for (let perLine = 6; perLine <= 14; perLine++) {
      const lines = Math.ceil(capacity / perLine);
      // Room for a sideways riichi tile and the gaps between groups of six.
      const groups = perLine % 6 === 0 ? perLine / 6 - 1 : 0;
      const byWidth = pondW / (perLine + 0.34 + groups * 0.25);
      const byHeight = (rowH - (lines - 1) * LINE_GAP) / lines / (4 / 3);
      const tw = Math.floor(Math.min(byWidth, byHeight, 44) * 2) / 2;
      // Prefer the classic rows of six when the size is about the same.
      const better = tw > best.tw + 1 || (tw >= best.tw - 1 && perLine % 6 === 0 && best.perLine % 6 !== 0);
      if (better) best = { tw, perLine };
    }
    return best;
  }
  const layout = $derived(fit(box.w, box.h, capacity));
</script>

<div class="board">
  <div class="round">
    <div class="round-text">
      <strong>{WINDS[view.roundWind]} {view.dealer + 1}</strong>
      <span class="dim">
        {view.honba} honba{view.riichiSticks ? ` · ${view.riichiSticks} riichi` : ''}
      </span>
    </div>
    <!-- The indicator is the flipped tile; the dora is the next tile in its sequence. -->
    <div class="dora">
      <span class="dim">Dora</span>
      {#each view.doraIndicators as t (t)}
        <span class="dora-pair" title="Indicator → dora">
          <span class="indicator"><Tile tile={t} {red} plain /></span>
          <span class="arrow" aria-hidden="true">→</span>
          <Tile tile={doraFromIndicator(kindOf(t)) * 4 + 1} {red} />
        </span>
      {/each}
    </div>
    <span class="wall" aria-label="{view.wallCount} tiles left in the wall">
      <span class="wall-tile" aria-hidden="true"></span>{view.wallCount}
    </span>
  </div>

  <div class="rows" bind:this={rowsEl} style:--tw="{layout.tw}px">
    {#each rows as { rel, seat } (seat)}
      {@const p = view.players[seat]}
      <section class="seat" class:me={rel === 0} class:active={active === seat} aria-label="{names[seat]}, {POS[rel]}">
        <div class="info">
          <span class="wind" class:dealer={p.seatWind === 0}>{WIND_SHORT[p.seatWind]}</span>
          <span class="score">{p.score}</span>
          {#if p.riichi}<span class="stick" title="Riichi"></span>{/if}
        </div>
        <div class="main">
          <div class="top">
            <span class="name">{names[seat]}</span>
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

  .round {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 4px 8px;
    border-radius: 10px;
    background: var(--surface);
    font-size: 0.8rem;
    --tw: 18px;
  }
  .round-text {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
  }
  .dora {
    display: flex;
    align-items: center;
    gap: 2px;
  }
  .dora .dim {
    margin-right: 4px;
  }
  .dora-pair {
    display: inline-flex;
    align-items: flex-end;
    gap: 1px;
    margin-left: 4px;
    --tw: 22px;
  }
  .indicator {
    --tw: 14px;
    opacity: 0.8;
  }
  .arrow {
    font-size: 0.7rem;
    color: var(--ink-dim);
    align-self: center;
  }
  .dim {
    color: var(--ink-dim);
  }
  .wall {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .wall-tile {
    width: 12px;
    height: 16px;
    border: 1.5px solid var(--ink-dim);
    border-radius: 3px;
  }

  /* Four equal rows filling the space between the round bar and the own hand. */
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
    grid-template-columns: 44px 1fr;
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
  .top {
    display: flex;
    align-items: flex-end;
    gap: 6px;
    height: 22px;
    font-size: 0.8rem;
    --tw: 13px;
  }
  .name {
    font-weight: 600;
  }
  .hidden-hand {
    display: flex;
    opacity: 0.85;
  }
  .melds {
    margin-left: auto;
    --tw: 16px;
  }
</style>
