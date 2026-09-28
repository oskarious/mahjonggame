<script lang="ts">
  import { onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { DEFAULT_RULES, EMA_2025, type HintLevel, makeRules } from '@mahjong/engine';
  import { LocalGame } from '$lib/game/local.svelte';
  import { randomId } from '$lib/random';
  import { parseBotElo } from '$lib/bots';
  import { WINDS } from '$lib/labels';
  import LocalSettings from '$lib/components/LocalSettings.svelte';
  import Table from '$lib/components/Table.svelte';

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
  let table: Table | undefined = $state();

  function restart() {
    const settings = { ...game.settings };
    game.destroy();
    game = newGame();
    Object.assign(game.settings, settings);
    table?.reset();
  }

  onDestroy(() => game.destroy());

  const revealed = $derived(game.settings.reveal ? game.state.hand.players.map((p) => p.hand) : null);
</script>

<svelte:head><title>{WINDS[game.view.roundWind]} {game.view.dealer + 1} · Riichi</title></svelte:head>

<Table
  bind:this={table}
  {game}
  hints={game.settings.hints}
  onhints={(l) => (game.settings.hints = l)}
  {revealed}
  onagain={restart}
  onhome={() => goto('/')}
>
  {#snippet settings()}
    <LocalSettings {game} onnew={restart} />
  {/snippet}
</Table>
