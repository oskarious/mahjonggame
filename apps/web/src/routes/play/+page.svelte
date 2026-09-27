<script lang="ts">
  import { onDestroy, setContext } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import {
    DEFAULT_RULES,
    EMA_2025,
    type HintLevel,
    type Kind,
    doraFromIndicator,
    kindOf,
    makeRules,
  } from '@mahjong/engine';
  import { TILE_MARKS, type TileMarks } from '$lib/marks';
  import { LocalGame } from '$lib/game/local.svelte';
  import { randomId } from '$lib/random';
  import { parseBotElo } from '$lib/bots';
  import { WINDS } from '$lib/labels';
  import Board from '$lib/components/Board.svelte';
  import DevPanel from '$lib/components/DevPanel.svelte';
  import FinalSheet from '$lib/components/FinalSheet.svelte';
  import PlayerArea from '$lib/components/PlayerArea.svelte';
  import ResultSheet from '$lib/components/ResultSheet.svelte';

  const QUICK_KEY = 'riichi:quickDiscard';
  const LABELS_KEY = 'riichi:tileLabels';

  function newGame(): LocalGame {
    const q = page.url.searchParams;
    const base = q.get('preset') === 'ema' ? EMA_2025 : DEFAULT_RULES;
    const rules = makeRules(base, { length: q.get('length') === 'south' ? 'south' : 'east' });
    const seed = q.get('seed') ?? randomId();
    const human = Math.floor(Math.random() * 4);
    return new LocalGame(rules, seed, human, {
      botElo: parseBotElo(q.get('bots')),
      hints: (q.get('hints') as HintLevel) ?? 'waits',
    });
  }

  let game = $state(newGame());
  let showSettings = $state(false);
  let showFinal = $state(false);
  let quickDiscard = $state(readFlag(QUICK_KEY, false));
  let tileLabels = $state(readFlag(LABELS_KEY, true));

  function readFlag(key: string, fallback: boolean) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : v === '1';
    } catch {
      return fallback;
    }
  }
  function writeFlag(key: string, v: boolean) {
    try {
      localStorage.setItem(key, v ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
  }
  function setQuick(v: boolean) {
    quickDiscard = v;
    writeFlag(QUICK_KEY, v);
  }
  function setLabels(v: boolean) {
    tileLabels = v;
    writeFlag(LABELS_KEY, v);
  }

  $effect(() => {
    document.body.classList.toggle('no-tile-labels', !tileLabels);
    return () => document.body.classList.remove('no-tile-labels');
  });

  function restart() {
    const settings = { ...game.settings };
    game.destroy();
    game = newGame();
    Object.assign(game.settings, settings);
    showFinal = false;
    showSettings = false;
  }

  onDestroy(() => game.destroy());

  const view = $derived(game.view);

  // Board-wide tile markings: dora, and every copy of the tile the player is looking at.
  let focusKind: Kind | null = $state(null);
  const marks: TileMarks = $state({ dora: new Set(), focus: null });
  setContext(TILE_MARKS, marks);
  $effect(() => {
    marks.dora = new Set(view.doraIndicators.map((t) => doraFromIndicator(kindOf(t))));
    marks.focus = focusKind;
  });
  const red = $derived(game.rules.redFives);
  const revealed = $derived(game.settings.reveal ? game.state.hand.players.map((p) => p.hand) : null);
</script>

<svelte:head><title>{WINDS[view.roundWind]} {view.dealer + 1} · Riichi</title></svelte:head>

<div class="screen">
  <header>
    <button class="icon" aria-label="Home" onclick={() => goto('/')}>←</button>
    <span class="title">{game.names[view.seat]} · {WINDS[view.players[view.seat].seatWind]}</span>
    <button class="icon" aria-label="Settings" onclick={() => (showSettings = true)}>⚙</button>
  </header>

  <div class="board-wrap">
    <Board {view} names={game.names} {red} {revealed} />
  </div>

  {#if game.error}<p class="error" role="alert">{game.error}</p>{/if}

  <PlayerArea {view} {red} {quickDiscard} bind:focusKind onact={(a) => game.act(a)} />
</div>

{#if view.result && (view.phase === 'handOver' || (view.phase === 'gameOver' && !showFinal))}
  <ResultSheet
    result={view.result}
    {view}
    names={game.names}
    {red}
    nextLabel={view.phase === 'gameOver' ? 'Final results' : 'Next hand'}
    onnext={() => (view.phase === 'gameOver' ? (showFinal = true) : game.act({ type: 'nextHand' }))}
  />
{/if}

{#if view.final && showFinal}
  <FinalSheet final={view.final} names={game.names} me={view.seat} onagain={restart} onhome={() => goto('/')} />
{/if}

{#if showSettings}
  <DevPanel {game} {quickDiscard} onquick={setQuick} {tileLabels} onlabels={setLabels} onclose={() => (showSettings = false)} onnew={restart} />
{/if}

<style>
  .screen {
    height: 100dvh;
    max-width: 560px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: env(safe-area-inset-top);
  }
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 6px 0;
  }
  .icon {
    width: 44px;
    height: 44px;
    font-size: 1.3rem;
    border-radius: 50%;
    color: var(--ink-dim);
  }
  .title {
    font-size: 0.85rem;
    color: var(--ink-dim);
  }
  .board-wrap {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .error {
    margin: 0 8px;
    padding: 6px 10px;
    border-radius: 8px;
    background: var(--danger);
    color: #1f0c05;
    font-size: 0.85rem;
  }
</style>
