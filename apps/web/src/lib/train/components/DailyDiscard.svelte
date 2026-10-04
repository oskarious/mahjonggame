<script lang="ts">
  import { onMount, setContext, untrack } from 'svelte';
  import { type Action, type Kind, doraFromIndicator, kindOf, viewFor } from '@mahjong/engine';
  import Band from '$lib/components/Band.svelte';
  import PlayerArea from '$lib/components/PlayerArea.svelte';
  import Tile from '$lib/components/Tile.svelte';
  import { stateOf } from '@mahjong/drills/goals';
  import { RED } from '@mahjong/drills/position';
  import type { ExerciseOf } from '@mahjong/drills/types';
  import { TILE_MARKS, type TileMarks } from '$lib/marks';
  import { tileset } from '$lib/tileset.svelte';
  import type { Tally } from '@mahjong/drills/daily-discard';

  /**
   * The home page's poll: discard any tile, then see what everyone else threw. No right answer and no stats before
   * the vote, so nothing nudges it.
   */
  let {
    date,
    exercise,
    mine: initialMine,
    tally: initialTally,
  }: { date: string; exercise: ExerciseOf<'discard'>; mine: Kind | null; tally: Tally | null } = $props();

  const g = stateOf(untrack(() => exercise))!;
  let mine = $state(untrack(() => initialMine));
  let tally = $state(untrack(() => initialTally));
  let sending = $state(false);
  let failed = $state(false);

  let focusKind: Kind | null = $state(null);
  const marks: TileMarks = $state({
    dora: new Set(g.hand.doraIndicators.slice(0, g.hand.doraRevealed).map((t) => doraFromIndicator(kindOf(t)))),
    focus: null,
  });
  $effect(() => {
    marks.focus = focusKind;
  });
  setContext(TILE_MARKS, marks);

  const baseView = viewFor(g, 0, { hints: 'off' });
  const view = $derived({
    ...baseView,
    actions: mine === null && !sending ? baseView.actions.filter((a) => a.type === 'discard' && !a.riichi) : [],
  });

  async function onact(a: Action) {
    if (a.type !== 'discard' || mine !== null || sending) return;
    sending = true;
    failed = false;
    try {
      const res = await fetch('/daily-discard', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ date, kind: kindOf(a.tile) }),
      });
      // A new day began while the page was open: show the new hand.
      if (res.status === 409) return location.reload();
      if (!res.ok) throw new Error(String(res.status));
      ({ mine, tally } = (await res.json()) as { mine: Kind; tally: Tally });
    } catch {
      failed = true;
    } finally {
      sending = false;
    }
  }

  // Time to the next hand (UTC midnight), from the device clock; read on mount, so the server renders none.
  let left: number | null = $state(null);
  onMount(() => {
    const next = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() + 1);
    const tick = () => {
      left = Math.max(0, next - Date.now());
      // The new hand is out: show it.
      if (left === 0) location.reload();
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  });
  const clock = (ms: number) => {
    const s = Math.ceil(ms / 1000);
    const two = (n: number) => String(n).padStart(2, '0');
    return `${Math.floor(s / 3600)}:${two(Math.floor(s / 60) % 60)}:${two(s % 60)}`;
  };

  const pct = (n: number) => (tally && tally.total ? Math.round((100 * n) / tally.total) : 0);
</script>

<Band title="Daily discard" style="--tile-ratio: {tileset().ratio}">
  {#snippet aside()}
    {#if left !== null}<span aria-label="Next hand in">{clock(left)}</span>{/if}
  {/snippet}
  <div class="slice">
    <PlayerArea {view} red={RED} quickDiscard={false} bind:focusKind {onact} showWaits={false} info={{ round: true, dora: true, wall: false }} />
  </div>

  {#if failed}
    <p class="error" role="alert">Couldn't send. Try again.</p>
  {/if}

  {#if mine !== null && tally}
    <table class="votes" aria-live="polite">
      <tbody>
        {#each tally.counts as c (c.kind)}
          <tr class:mine={c.kind === mine}>
            <td class="tile" aria-label={c.kind === mine ? 'Your discard' : undefined}>
              <span class="dot" aria-hidden="true"></span><Tile tile={c.kind * 4 + 1} red={RED} plain />
            </td>
            <td class="bar"><span style:width="{pct(c.n)}%"></span></td>
            <td class="n">{pct(c.n)}%</td>
          </tr>
        {/each}
      </tbody>
    </table>
    <p class="total">{tally.total} {tally.total === 1 ? 'vote' : 'votes'}</p>
  {/if}
</Band>

<style>
  .error,
  .total {
    padding: 0 var(--band-inset);
  }
  .slice {
    /* PlayerArea anchors its magnifier above the hand; leave it room inside the card. */
    padding-top: 8px;
  }
  .error {
    margin: 0;
    color: var(--danger);
    font-size: 0.9rem;
  }
  .votes {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0 3px;
    font-variant-numeric: tabular-nums;
    font-size: 0.85rem;
  }
  td {
    padding: 3px 4px;
    vertical-align: middle;
    background: var(--panel);
  }
  td:first-child {
    border-radius: 8px 0 0 8px;
  }
  td:last-child {
    border-radius: 0 8px 8px 0;
  }
  .tile {
    --tw: 18px;
    width: 34px;
    white-space: nowrap;
  }
  .dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    margin-right: 4px;
    border-radius: 50%;
    vertical-align: middle;
  }
  .mine .dot {
    background: var(--ink);
  }
  .bar span {
    display: block;
    height: 10px;
    min-width: 2px;
    border-radius: 5px;
    background: var(--ink-dim);
  }
  .mine .bar span {
    background: var(--ink);
  }
  .n {
    font-weight: 700;
    text-align: right;
    width: 3em;
  }
  .total {
    margin: 0;
    text-align: right;
    font-size: 0.8rem;
    color: var(--ink-dim);
  }
</style>
