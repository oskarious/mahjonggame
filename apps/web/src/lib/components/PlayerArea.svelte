<script lang="ts">
  import type { Snippet } from 'svelte';
  import {
    type Action,
    type Kind,
    type PlayerView,
    type RedFives,
    type Tile as TileId,
    doraFromIndicator,
    kindOf,
  } from '@mahjong/engine';
  import { WINDS } from '$lib/labels';
  import { kindName, sortTiles } from '$lib/tiles';
  import Tile from './Tile.svelte';

  interface Props {
    view: PlayerView;
    red: RedFives;
    /** Discard with a single tap instead of select + confirm. */
    quickDiscard: boolean;
    /** Out: kind being looked at (selected or under the finger), for highlighting copies on the board. */
    focusKind?: Kind | null;
    onact: (a: Action) => void;
    /** Open the settings sheet (the play screen has no header; the cog lives in this panel). */
    onsettings: () => void;
    /** Online: the own decision timer, shown just below the tile-to-act slot. */
    timer?: Snippet;
  }
  let { view, red, quickDiscard, focusKind = $bindable(null), onact, onsettings, timer }: Props = $props();

  let selected: TileId | null = $state(null);
  let riichiMode = $state(false);
  let picking: 'kan' | 'chii' | null = $state(null);

  // Any new game state clears local UI state.
  $effect(() => {
    void view.seq;
    selected = null;
    hovered = null;
    riichiMode = false;
    picking = null;
  });

  const actions = $derived(view.actions);
  const discardable = $derived(
    new Set(actions.flatMap((a) => (a.type === 'discard' && !a.riichi ? [a.tile] : []))),
  );
  const riichiable = $derived(new Set(actions.flatMap((a) => (a.type === 'discard' && a.riichi ? [a.tile] : []))));
  const onTurn = $derived(discardable.size > 0);
  const find = (type: Action['type']) => actions.find((a) => a.type === type);
  const kans = $derived(actions.filter((a): a is Extract<Action, { type: 'kan' }> => a.type === 'kan'));
  const chiis = $derived(actions.filter((a): a is Extract<Action, { type: 'chii' }> => a.type === 'chii'));
  const inCall = $derived(!onTurn && actions.length > 0);
  /** Something to decide: buttons cover the left side (choices) and the right side (Pass / Back). */
  const leftButtons = $derived(
    picking !== null ||
      inCall ||
      (onTurn && (!!find('tsumo') || riichiable.size > 0 || kans.length > 0 || !!find('kyuushu'))),
  );
  const rightButton = $derived(picking !== null || inCall);

  const concealed = $derived(sortTiles(view.hand.filter((t) => t !== view.drawn)));

  const hints = $derived(view.hints);
  const best = $derived.by(() => {
    const opts = hints?.discards;
    if (!opts?.length) return new Set<Kind>();
    const top = opts[0];
    return new Set(opts.filter((o) => o.shanten === top.shanten && o.total === top.total).map((o) => o.kind));
  });
  /** Discard preview for the tile being looked at: pressed, hovered, or else the selected one. */
  const preview = $derived.by(() => {
    const p = (press ?? hovered) as { tile: TileId } | null;
    const t = p ? p.tile : selected;
    return t !== null ? (hints?.discards?.find((o) => o.kind === kindOf(t)) ?? null) : null;
  });

  /**
   * The current waits, never gated by the hint level: between turns, or on own turn in riichi (the drawn tile goes).
   */
  const current = $derived.by(() => {
    if (!onTurn) return view.tenpai.find((o) => o.kind === null) ?? null;
    if (!view.players[view.seat].riichi || view.drawn === null) return null;
    return view.tenpai.find((o) => o.kind === kindOf(view.drawn!)) ?? null;
  });
  /** Winning tiles for the panel: the inspected discard's (full hints), else the current ones, else the best discard's. */
  const panelWaits = $derived(preview ? preview.waits : (current?.waits ?? hints?.waits ?? []));

  const canDiscard = (t: TileId) => (riichiMode ? riichiable.has(t) : discardable.has(t));

  function discard(t: TileId) {
    onact({ type: 'discard', seat: view.seat, tile: t, ...(riichiMode ? { riichi: true } : {}) });
  }

  /** Select a tile, or discard it if it is already selected (or one-tap discard is on). */
  function tap(t: TileId, flick = false) {
    if (!canDiscard(t)) return;
    if (flick || quickDiscard || selected === t) discard(t);
    else selected = t;
  }

  // --- Touch handling, keyboard style: the whole hand strip is one target. The tile nearest the
  // finger is picked (no dead zones), a magnified copy floats above the thumb while pressing,
  // sliding sideways changes tile, and flicking upward before release discards directly. ---
  const FLICK_PX = 36;
  /** Upward movement after which the tile under the finger stops changing. */
  const LOCK_PX = 12;
  let meEl: HTMLElement | undefined = $state();
  let handEl: HTMLDivElement | undefined = $state();
  let drawnEl: HTMLSpanElement | undefined = $state();
  /** Magnifier anchor, relative to the section: x from its left edge, b = how far above its bottom. */
  interface Anchor {
    x: number;
    b: number;
  }
  /** `from`: the strip re-picks the tile under a level finger; the drawn slot only tracks the flick. */
  /** `touch`: finger or pen, where only the flick discards (a tap just inspects while held). */
  let press:
    | ({ tile: TileId; startY: number; flick: boolean; from: 'hand' | 'drawn'; touch: boolean } & Anchor)
    | null = $state(null);
  /** Where the selected tile sits, so its magnifier stays up after release. */
  let selectedAt: Anchor = $state({ x: 0, b: 0 });
  /** Mouse only: the tile under the cursor. Hover inspects; a click discards. */
  let hovered: ({ tile: TileId } & Anchor) | null = $state(null);

  /** Magnifier anchor for a tile centred at clientX, floating above `above`. */
  function anchor(clientX: number, above: Element): Anchor {
    const me = meEl!.getBoundingClientRect();
    return { x: clientX - me.left, b: me.bottom - above.getBoundingClientRect().top + 10 };
  }

  function tileAt(clientX: number): { tile: TileId; x: number } | null {
    if (!handEl || !meEl) return null;
    const origin = meEl.getBoundingClientRect().left;
    let best: { tile: TileId; x: number } | null = null;
    let bestDist = Infinity;
    for (const el of handEl.querySelectorAll<HTMLElement>('[data-tile]')) {
      const r = el.getBoundingClientRect();
      const center = r.left + r.width / 2;
      const dist = Math.abs(clientX - center);
      if (dist < bestDist) {
        bestDist = dist;
        best = { tile: Number(el.dataset.tile), x: center - origin };
      }
    }
    return best;
  }

  function pointerDown(e: PointerEvent) {
    // Off-turn presses only inspect (magnifier + highlighted copies); release does nothing then.
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const hit = tileAt(e.clientX);
    if (!hit) return;
    press = {
      ...hit,
      b: anchor(0, handEl!).b,
      startY: e.clientY,
      flick: false,
      from: 'hand',
      touch: e.pointerType !== 'mouse',
    };
    capture(handEl!, e);
  }

  /** The drawn tile is its own one-tile strip: same tap/flick rules, never slides into the hand. */
  function drawnDown(e: PointerEvent) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (view.drawn === null || !drawnEl) return;
    const r = drawnEl.getBoundingClientRect();
    press = {
      tile: view.drawn,
      ...anchor(r.left + r.width / 2, drawnEl),
      startY: e.clientY,
      flick: false,
      from: 'drawn',
      touch: e.pointerType !== 'mouse',
    };
    capture(drawnEl, e);
  }

  function capture(el: Element, e: PointerEvent) {
    try {
      // Keep receiving moves when the finger slides above the target (flick).
      el.setPointerCapture(e.pointerId);
    } catch {
      /* not an active pointer (e.g. synthetic events) */
    }
  }

  /** Mouse: the tile under the cursor in the strip or drawn slot, or null when off both. */
  function mouseTile(e: PointerEvent): ({ tile: TileId } & Anchor) | null {
    const inside = (el: Element | undefined) => {
      const r = el?.getBoundingClientRect();
      return !!r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    };
    if (inside(drawnEl) && view.drawn !== null) {
      const r = drawnEl!.getBoundingClientRect();
      return { tile: view.drawn, ...anchor(r.left + r.width / 2, drawnEl!) };
    }
    if (!inside(handEl)) return null;
    const hit = tileAt(e.clientX);
    return hit ? { ...hit, b: anchor(0, handEl!).b } : null;
  }

  function pointerMove(e: PointerEvent) {
    if (e.pointerType === 'mouse' && !press) {
      hovered = e.buttons ? null : mouseTile(e);
      return;
    }
    if (!press) return;
    // Mouse presses stay on their tile; the release decides (see pointerUp).
    if (!press.touch) return;
    const rise = press.startY - e.clientY;
    // Sliding sideways picks tiles only while the finger stays level; once it heads up for a
    // flick the tile is locked, so the thumb's sideways drift can't discard a neighbour.
    const hit = press.from === 'hand' && rise < LOCK_PX ? tileAt(e.clientX) : null;
    press = { ...press, ...(hit ?? {}), flick: rise > FLICK_PX };
  }

  function pointerUp(e: PointerEvent) {
    if (!press) return;
    const { tile, flick, touch } = press;
    press = null;
    // Touch: the flick is the only way to discard. A tap neither selects nor discards, so there is
    // no double-tap and the one-tap setting does not apply.
    if (touch) {
      if (flick) tap(tile, true);
      return;
    }
    // Mouse: one click discards, if pressed and released on the same tile. Never selects.
    const over = mouseTile(e);
    hovered = over;
    if (over?.tile === tile && canDiscard(tile)) discard(tile);
  }

  function pointerLeave(e: PointerEvent) {
    if (e.pointerType === 'mouse' && !press) hovered = null;
  }

  /** Keyboard activation only; pointer input is handled by the strip / drawn slot above. */
  function keyTap(e: MouseEvent, t: TileId) {
    if (e.detail !== 0) return;
    const hit = meEl?.querySelector<HTMLElement>(`[data-tile="${t}"]`);
    if (hit && handEl) {
      const r = hit.getBoundingClientRect();
      selectedAt = anchor(r.left + r.width / 2, handEl.contains(hit) ? handEl : hit);
    }
    tap(t);
  }

  /** Magnifier: the tile under the finger or cursor, or else the selected tile (strip or drawn). */
  const magnified = $derived.by(() => {
    const h = hovered as ({ tile: TileId } & Anchor) | null;
    return (
      press ??
      (h ? { ...h, flick: false } : null) ??
      (selected !== null ? { tile: selected, ...selectedAt, flick: false } : null)
    );
  });

  /**
   * What the hand waits on (any hint level): on turn, after discarding the magnified tile (if it can be discarded
   * now, so riichi mode only shows riichi discards); between turns, the current waits.
   */
  const waitsPreview = $derived.by(() => {
    const m = magnified as { tile: TileId } | null;
    if (!m) return null;
    if (!onTurn) return view.tenpai.find((o) => o.kind === null) ?? null;
    return canDiscard(m.tile) ? (view.tenpai.find((o) => o.kind === kindOf(m.tile)) ?? null) : null;
  });
  /** Measured magnifier width, so a wide one (waits row) is clamped fully on screen. */
  let magEl: HTMLDivElement | undefined = $state();
  let magWidth = $state(0);
  $effect(() => {
    void magnified;
    void waitsPreview;
    magWidth = magEl?.offsetWidth ?? 0;
  });

  const focus = $derived.by(() => {
    const pressed = (press ?? hovered) as { tile: TileId } | null;
    if (pressed) return kindOf(pressed.tile);
    return selected !== null ? kindOf(selected) : null;
  });
  $effect(() => {
    focusKind = focus;
  });



  /** In a call window: the hand tiles some offered call would use (the rest dim). Ron uses none. */
  const callTiles = $derived.by(() => {
    const out = new Set<TileId>();
    if (!inCall) return out;
    for (const a of actions) {
      if (a.type === 'pon' || a.type === 'chii') for (const t of a.tiles) out.add(t);
      if (a.type === 'daiminkan' && view.claimable) {
        const k = kindOf(view.claimable.tile);
        for (const t of view.hand) if (kindOf(t) === k) out.add(t);
      }
    }
    return out;
  });

  function tileState(t: TileId) {
    const allowed = riichiMode ? riichiable.has(t) : discardable.has(t);
    return {
      dim: onTurn ? !allowed : inCall && !callTiles.has(t),
      mark: (allowed && best.has(kindOf(t)) ? 'hint' : null) as 'hint' | null,
    };
  }

  /** Tiles still needed to win: 1 is tenpai. */
  function away(n: number) {
    return n === 0 ? 'Complete' : n === 1 ? 'Tenpai' : `${n} away`;
  }
</script>

<section class="me" bind:this={meEl}>
  <!-- One row, as tall as the tile slot: round + hints | the tile to act on | dora + wall + cog.
       When there is something to decide, the buttons overlay the left side and Pass/Back the right. -->
  <div class="panel">
    <div class="side left">
      <div class="info" class:covered={leftButtons}>
        <div class="round">
          <strong>{WINDS[view.roundWind]} {view.dealer + 1}</strong>
          <span class="dim">{view.honba} honba{view.riichiSticks ? ` · ${view.riichiSticks} riichi` : ''}</span>
        </div>
        <div class="hints">
          {#if hints}
            {#if hints.complete}
              <span class="chip gold">Complete!</span>
            {:else if hints.tenpai}
              <span class="chip good">Tenpai</span>
            {:else}
              <span class="chip">{away(hints.tilesAway)}</span>
            {/if}
          {/if}
          {#if current?.furiten}<span class="chip bad">Furiten</span>{/if}
          {#if preview}
            <span class="preview">
              → {preview.tenpai ? 'tenpai' : `${preview.shanten + 1} away`}
              {#if preview.furiten}<span class="chip bad">furiten</span>{/if}
            </span>
          {/if}
          {#if panelWaits.length}
            <span class="waits" aria-label="Winning tiles">
              {#each panelWaits as w (w.kind)}
                <span class="wait" title={kindName(w.kind)}>
                  <Tile tile={w.kind * 4 + 1} {red} plain /><small>×{w.remaining}</small>
                </span>
              {/each}
            </span>
          {:else if preview && preview.ukeire.length}
            <span class="sub">{preview.total} useful tiles</span>
          {/if}
        </div>
      </div>
      {#if leftButtons}
        <div class="overlay" role="toolbar" aria-label="Actions">
          {#if picking === 'kan'}
            {#each kans as a (a.kind)}
              <button class="btn choice" onclick={() => onact(a)}><Tile tile={a.kind * 4 + 1} {red} /> Kan</button>
            {/each}
          {:else if picking === 'chii'}
            {#each chiis as a (a.tiles.join())}
              <button class="btn choice" onclick={() => onact(a)}>
                {#each sortTiles([...a.tiles, view.claimable!.tile]) as t (t)}<Tile tile={t} {red} />{/each}
              </button>
            {/each}
          {:else if onTurn}
            {#if find('tsumo')}<button class="btn primary" onclick={() => onact(find('tsumo')!)}>Tsumo</button>{/if}
            {#if riichiable.size}
              <button class="btn" class:primary={riichiMode} onclick={() => ((riichiMode = !riichiMode), (selected = null))}>
                Riichi
              </button>
            {/if}
            {#if kans.length}
              <button class="btn" onclick={() => (kans.length === 1 ? onact(kans[0]) : (picking = 'kan'))}>Kan</button>
            {/if}
            {#if find('kyuushu')}<button class="btn ghost" onclick={() => onact(find('kyuushu')!)}>Abort hand</button>{/if}
          {:else if inCall}
            {#if find('ron')}<button class="btn primary" onclick={() => onact(find('ron')!)}>Ron</button>{/if}
            {#if find('pon')}<button class="btn" onclick={() => onact(find('pon')!)}>Pon</button>{/if}
            {#if chiis.length}
              <button class="btn" onclick={() => (chiis.length === 1 ? onact(chiis[0]) : (picking = 'chii'))}>Chii</button>
            {/if}
            {#if find('daiminkan')}<button class="btn" onclick={() => onact(find('daiminkan')!)}>Kan</button>{/if}
          {/if}
        </div>
      {/if}
    </div>

    <span class="middle">
      {@render timer?.()}
      {#if inCall}
        <span class="claim">
          <Tile tile={view.claimable?.tile ?? null} {red} />
        </span>
      {:else if view.drawn !== null}
        {@const d = view.drawn}
        {@const s = tileState(d)}
        <span
          class="drawn"
          role="group"
          aria-label="Drawn tile"
          data-tile={d}
          bind:this={drawnEl}
          onpointerdown={drawnDown}
          onpointermove={pointerMove}
          onpointerup={pointerUp}
          onpointerleave={pointerLeave}
          onpointercancel={() => (press = null)}
        >
          <Tile tile={d} {red} compact selected={selected === d} dim={s.dim} mark={s.mark} onclick={(e) => keyTap(e, d)} />
        </span>
      {/if}
    </span>

    <div class="side right">
      <div class="info" class:covered={rightButton}>
        <div class="dora">
          <span class="dim">Dora</span>
          <!-- The indicator is the flipped tile; the dora is the next tile in its sequence. -->
          {#each view.doraIndicators as t (t)}
            <span class="dora-pair" title="Indicator → dora">
              <span class="indicator"><Tile tile={t} {red} plain /></span>
              <span class="arrow" aria-hidden="true">→</span>
              <Tile tile={doraFromIndicator(kindOf(t)) * 4 + 1} {red} />
            </span>
          {/each}
        </div>
        <div class="bottom">
          <span class="wall" aria-label="{view.wallCount} tiles left in the wall">
            <span class="wall-tile" aria-hidden="true"></span>{view.wallCount}
          </span>
          <button class="cog" aria-label="Settings" onclick={onsettings}>⚙</button>
        </div>
      </div>
      {#if rightButton}
        <div class="overlay">
          {#if picking !== null}
            <button class="btn ghost" onclick={() => (picking = null)}>Back</button>
          {:else}
            <button class="btn ghost" onclick={() => onact(find('pass')!)}>Pass</button>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <div
    class="hand"
    role="toolbar"
    aria-label="Your hand"
    tabindex="-1"
    class:turn={onTurn}
    bind:this={handEl}
    style:--n={concealed.length}
    onpointerdown={pointerDown}
    onpointermove={pointerMove}
    onpointerup={pointerUp}
    onpointerleave={pointerLeave}
    onpointercancel={() => (press = null)}
  >
    {#each concealed as t (t)}
      {@const s = tileState(t)}
      <span class="slot" data-tile={t}>
        <Tile tile={t} {red} compact selected={selected === t} dim={s.dim} mark={s.mark} onclick={(e) => keyTap(e, t)} />
      </span>
    {/each}
  </div>

  {#if magnified}
    <div
      class="magnifier"
      class:flick={magnified.flick}
      class:blocked={onTurn && !canDiscard(magnified.tile)}
      style:--x="{magnified.x}px"
      style:--b="{magnified.b}px"
      style:--half="{Math.max(52, magWidth / 2 + 4)}px"
      bind:this={magEl}
    >
      <Tile tile={magnified.tile} {red} plain />
      {#if waitsPreview}
        <span class="mag-waits" aria-label="Winning tiles">
          {#each waitsPreview.waits as w (w.kind)}
            <span class="wait" class:dead={w.remaining === 0} title={kindName(w.kind)}>
              <Tile tile={w.kind * 4 + 1} {red} plain /><small>×{w.remaining}</small>
            </span>
          {/each}
          {#if waitsPreview.furiten}<span class="chip bad">furiten</span>{/if}
        </span>
      {/if}
    </div>
  {/if}
</section>

<style>
  /* A size container, so hand tiles fit the game column (not the whole window) on wide screens. */
  .me {
    container-type: inline-size;
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 0 8px calc(10px + env(safe-area-inset-bottom));
  }

  /* left | middle | right: one row, as tall as the tile slot. */
  .panel {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    column-gap: 8px;
    font-size: 0.8rem;
  }
  .side {
    position: relative;
    min-width: 0;
  }
  .info {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .right .info {
    align-items: flex-end;
  }
  /* Kept in layout (so nothing shifts) but hidden while buttons cover it. */
  .info.covered {
    visibility: hidden;
  }
  /* Buttons: anchored to the bottom of their side, centred when they fit, growing upward over the
     board when they do not (three chii options). Two per row on the left; Pass/Back fills the right. */
  .overlay {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    min-height: 100%;
    display: flex;
    flex-wrap: wrap;
    align-content: center;
    align-items: center;
    gap: 4px;
    z-index: 5;
    --tw: calc(18px * 4 / 3 / var(--tile-ratio, 4 / 3));
  }
  .overlay .btn {
    flex: 1 1 calc(50% - 4px);
    min-width: 0;
    min-height: 34px;
    padding: 0 8px;
    font-size: 0.95rem;
  }
  .overlay .choice {
    flex-basis: 100%;
    gap: 1px;
  }
  .right .overlay .btn {
    flex-basis: 100%;
    min-height: 48px;
  }

  .round {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    column-gap: 6px;
    line-height: 1.2;
  }
  .dora {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    align-items: center;
    gap: 2px 6px;
    --tw: calc(18px * 4 / 3 / var(--tile-ratio, 4 / 3));
  }
  .dora-pair {
    display: inline-flex;
    align-items: flex-end;
    gap: 1px;
    --tw: calc(22px * 4 / 3 / var(--tile-ratio, 4 / 3));
  }
  .indicator {
    --tw: calc(14px * 4 / 3 / var(--tile-ratio, 4 / 3));
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
  .bottom {
    display: flex;
    align-items: center;
    gap: 6px;
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
  .cog {
    flex: none;
    width: 32px;
    height: 32px;
    margin-right: -6px;
    font-size: 1.15rem;
    border-radius: 50%;
    color: var(--ink-dim);
  }

  .hints {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
    min-width: 0;
  }
  .preview,
  .sub {
    color: var(--ink-dim);
  }
  .waits {
    display: inline-flex;
    gap: 5px;
    --tw: calc(24px * 4 / 3 / var(--tile-ratio, 4 / 3));
  }
  .wait {
    display: inline-flex;
    align-items: flex-end;
    gap: 1px;
  }
  .wait small {
    font-size: 0.7rem;
    color: var(--ink-dim);
  }

  /* The slot keeps its height even when empty (off turn, no call), so the panel never jumps. It is the same for
     every tileset: the tile in it is as tall as a 44 px Classic tile (narrower with a taller ratio). All panel and
     magnifier tiles are sized like this (Classic width × 4/3 ÷ ratio), so switching tilesets never resizes the panel. */
  .middle {
    position: relative;
    --slot-h: calc(44px * 4 / 3);
    display: flex;
    align-items: center;
    min-height: calc(var(--slot-h) + 14px);
  }
  /* The tile to act on: the drawn tile, or the claimable tile during a call window (never both). */
  .claim,
  .drawn {
    --tw: calc(var(--slot-h) / var(--tile-ratio, 4 / 3));
    display: inline-flex;
    padding: 8px 10px 6px;
    border-radius: 12px;
    background: var(--panel-2);
  }
  .drawn {
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }

  /* The strip is taller than the tiles: anywhere in it picks the nearest tile.
     Tiles split the width by how many are held (--n), so open hands get bigger tiles, up to the height of a 52 px
     Classic tile (taller tilesets would otherwise take the board's height once a few sets are called). */
  .hand {
    --tw: min(calc((100cqw - 10px) / var(--n, 13)), calc(52px * 4 / 3 / var(--tile-ratio, 4 / 3)));
    position: relative;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    margin: 0 -5px;
    padding-top: calc(var(--tw) * 0.55);
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
  }
  .slot {
    display: inline-flex;
  }

  .magnifier {
    --tw: calc(56px * 4 / 3 / var(--tile-ratio, 4 / 3));
    position: absolute;
    bottom: var(--b, 0px);
    translate: -50% 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 10px 12px 8px;
    border-radius: 14px;
    background: var(--panel-2);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    pointer-events: none;
    z-index: 10;
    /* Own width, not shrink-to-fit near the edge, so the measured --half (below) is stable. */
    width: max-content;
    /* Keep it on screen at the edges (--half: half its measured width). */
    left: clamp(var(--half, 52px), var(--x, 50%), calc(100% - var(--half, 52px)));
  }
  /* Riichi mode: what the magnified discard would wait on. At most 5 per row. */
  .mag-waits {
    --tw: calc(22px * 4 / 3 / var(--tile-ratio, 4 / 3));
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 4px 6px;
    max-width: calc(5 * 42px);
  }
  .mag-waits .wait.dead {
    opacity: 0.4;
  }
  .magnifier.flick .wait small {
    color: inherit;
  }
  .magnifier.flick {
    background: var(--accent);
    color: var(--accent-ink);
    translate: -50% -12px;
  }
  .magnifier.blocked {
    opacity: 0.75;
  }
</style>
