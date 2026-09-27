<script lang="ts">
  import { type Action, type Kind, type PlayerView, type RedFives, type Tile as TileId, kindOf } from '@mahjong/engine';
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
  }
  let { view, red, quickDiscard, focusKind = $bindable(null), onact }: Props = $props();

  let selected: TileId | null = $state(null);
  let riichiMode = $state(false);
  let picking: 'kan' | 'chii' | null = $state(null);

  // Any new game state clears local UI state.
  $effect(() => {
    void view.seq;
    selected = null;
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

  const concealed = $derived(sortTiles(view.hand.filter((t) => t !== view.drawn)));

  const hints = $derived(view.hints);
  const best = $derived.by(() => {
    const opts = hints?.discards;
    if (!opts?.length) return new Set<Kind>();
    const top = opts[0];
    return new Set(opts.filter((o) => o.shanten === top.shanten && o.total === top.total).map((o) => o.kind));
  });
  const preview = $derived(
    selected !== null ? (hints?.discards?.find((o) => o.kind === kindOf(selected!)) ?? null) : null,
  );

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
  let handEl: HTMLDivElement | undefined = $state();
  let press: { tile: TileId; x: number; startY: number; flick: boolean } | null = $state(null);
  /** Where the selected tile sits in the strip, so its magnifier stays up after release. */
  let selectedX = $state(0);

  function tileAt(clientX: number): { tile: TileId; x: number } | null {
    if (!handEl) return null;
    const origin = handEl.getBoundingClientRect().left;
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
    press = { ...hit, startY: e.clientY, flick: false };
    try {
      // Keep receiving moves when the finger slides above the strip (flick).
      handEl!.setPointerCapture(e.pointerId);
    } catch {
      /* not an active pointer (e.g. synthetic events) */
    }
  }

  function pointerMove(e: PointerEvent) {
    if (!press) return;
    const rise = press.startY - e.clientY;
    // Sliding sideways picks tiles only while the finger stays level; once it heads up for a
    // flick the tile is locked, so the thumb's sideways drift can't discard a neighbour.
    const hit = rise < LOCK_PX ? tileAt(e.clientX) : null;
    press = { ...press, ...(hit ?? {}), flick: rise > FLICK_PX };
  }

  function pointerUp() {
    if (!press) return;
    const { tile, flick, x } = press;
    press = null;
    selectedX = x;
    tap(tile, flick);
  }

  /** Keyboard activation only; pointer input is handled by the strip above. */
  function keyTap(e: MouseEvent, t: TileId) {
    if (e.detail !== 0) return;
    const hit = handEl?.querySelector<HTMLElement>(`[data-tile="${t}"]`);
    if (hit && handEl) {
      const r = hit.getBoundingClientRect();
      selectedX = r.left + r.width / 2 - handEl.getBoundingClientRect().left;
    }
    tap(t);
  }

  /** Magnifier: the tile under the finger, or else the selected tile. */
  const magnified = $derived(
    press ?? (selected !== null ? { tile: selected, x: selectedX, flick: false } : null),
  );

  const focus = $derived.by(() => {
    const pressed = press as { tile: TileId } | null;
    if (pressed) return kindOf(pressed.tile);
    return selected !== null ? kindOf(selected) : null;
  });
  $effect(() => {
    focusKind = focus;
  });



  function tileState(t: TileId) {
    const allowed = riichiMode ? riichiable.has(t) : discardable.has(t);
    return {
      dim: onTurn && !allowed,
      mark: (allowed && best.has(kindOf(t)) ? 'hint' : null) as 'hint' | null,
    };
  }

  /** Tiles still needed to win: 1 is tenpai. */
  function away(n: number) {
    return n === 0 ? 'Complete' : n === 1 ? 'Tenpai' : `${n} away`;
  }
</script>

<section class="me">
  <div class="status">
    <div class="hints">
      {#if hints}
        {#if hints.complete}
          <span class="chip gold">Complete!</span>
        {:else if hints.tenpai}
          <span class="chip good">Tenpai</span>
        {:else}
          <span class="chip">{away(hints.tilesAway)}</span>
        {/if}
        {#if hints.furiten}<span class="chip bad">Furiten</span>{/if}
        {#if preview}
          <span class="preview">
            → {preview.tenpai ? 'tenpai' : `${preview.shanten + 1} away`}
            {#if preview.furiten}<span class="chip bad">furiten</span>{/if}
          </span>
        {/if}
        {#if (preview ?? hints).waits?.length}
          <span class="waits" aria-label="Winning tiles">
            {#each (preview ?? hints).waits! as w (w.kind)}
              <span class="wait" title={kindName(w.kind)}>
                <Tile tile={w.kind * 4 + 1} {red} plain /><small>×{w.remaining}</small>
              </span>
            {/each}
          </span>
        {:else if preview && preview.ukeire.length}
          <span class="sub">{preview.total} useful tiles</span>
        {/if}
      {/if}
    </div>
  </div>

  <div class="actions" role="toolbar" aria-label="Actions">
    {#if picking === 'kan'}
      {#each kans as a (a.kind)}
        <button class="btn choice" onclick={() => onact(a)}><Tile tile={a.kind * 4 + 1} {red} /> Kan</button>
      {/each}
      <button class="btn ghost" onclick={() => (picking = null)}>Back</button>
    {:else if picking === 'chii'}
      {#each chiis as a (a.tiles.join())}
        <button class="btn choice" onclick={() => onact(a)}>
          {#each sortTiles([...a.tiles, view.claimable!.tile]) as t (t)}<Tile tile={t} {red} />{/each}
        </button>
      {/each}
      <button class="btn ghost" onclick={() => (picking = null)}>Back</button>
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
      <span class="claim">
        <Tile tile={view.claimable?.tile ?? null} {red} />
      </span>
      {#if find('ron')}<button class="btn primary" onclick={() => onact(find('ron')!)}>Ron</button>{/if}
      {#if find('pon')}<button class="btn" onclick={() => onact(find('pon')!)}>Pon</button>{/if}
      {#if chiis.length}
        <button class="btn" onclick={() => (chiis.length === 1 ? onact(chiis[0]) : (picking = 'chii'))}>Chii</button>
      {/if}
      {#if find('daiminkan')}<button class="btn" onclick={() => onact(find('daiminkan')!)}>Kan</button>{/if}
      <button class="btn ghost" onclick={() => onact(find('pass')!)}>Pass</button>
    {/if}
  </div>

  <div
    class="hand"
    role="toolbar"
    aria-label="Your hand"
    tabindex="-1"
    class:turn={onTurn}
    bind:this={handEl}
    onpointerdown={pointerDown}
    onpointermove={pointerMove}
    onpointerup={pointerUp}
    onpointercancel={() => (press = null)}
  >
    {#each concealed as t (t)}
      {@const s = tileState(t)}
      <span class="slot" data-tile={t}>
        <Tile tile={t} {red} selected={selected === t} dim={s.dim} mark={s.mark} onclick={(e) => keyTap(e, t)} />
      </span>
    {/each}
    {#if view.drawn !== null}
      {@const d = view.drawn}
      {@const s = tileState(d)}
      <span class="gap"></span>
      <span class="slot" data-tile={d}>
        <Tile tile={d} {red} selected={selected === d} dim={s.dim} mark={s.mark} onclick={(e) => keyTap(e, d)} />
      </span>
    {/if}

    {#if magnified}
      <div
        class="magnifier"
        class:flick={magnified.flick}
        class:blocked={onTurn && !canDiscard(magnified.tile)}
        style:--x="{magnified.x}px"
      >
        <Tile tile={magnified.tile} {red} plain />
      </div>
    {/if}
  </div>
</section>

<style>
  /* A size container, so hand tiles fit the game column (not the whole window) on wide screens. */
  .me {
    container-type: inline-size;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 0 8px calc(10px + env(safe-area-inset-bottom));
  }

  .status {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 8px;
    min-height: 30px;
    --tw: min(calc((100vw - 16px) / 24), 22px);
  }

  .hints {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    font-size: 0.85rem;
  }
  .preview,
  .sub {
    color: var(--ink-dim);
  }
  .waits {
    display: inline-flex;
    gap: 4px;
    --tw: 16px;
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

  .actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    min-height: 48px;
    --tw: 20px;
  }
  .actions .btn {
    flex: 0 1 auto;
    min-width: 72px;
  }
  .choice {
    gap: 1px;
  }
  .claim {
    margin-right: auto;
    --tw: 26px;
  }

  /* The strip is taller than the tiles: anywhere in it picks the nearest tile. */
  .hand {
    --tw: min(calc((100cqw - 10px) / 14.4), 52px);
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
    --tw: 56px;
    position: absolute;
    bottom: calc(100% + 10px);
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
    /* Keep it on screen at the edges. */
    left: clamp(52px, var(--x, 50%), calc(100% - 52px));
  }
  .magnifier.flick {
    background: var(--accent);
    color: var(--accent-ink);
    translate: -50% -12px;
  }
  .magnifier.blocked {
    opacity: 0.75;
  }
  /* Separates the drawn tile from the hand; never squeezed away. */
  .gap {
    flex: none;
    width: calc(var(--tw) * 0.35);
  }
</style>
