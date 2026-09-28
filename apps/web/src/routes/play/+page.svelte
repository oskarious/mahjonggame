<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { goto, replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import { DEFAULT_RULES, EMA_2025, type HintLevel, type RuleSet, makeRules } from '@mahjong/engine';
  import { LocalGame, type LocalSettings as Settings } from '$lib/game/local.svelte';
  import { clearSave, loadSave } from '$lib/game/saved';
  import { randomId } from '$lib/random';
  import { parseBotElo } from '$lib/bots';
  import { WINDS } from '$lib/labels';
  import LocalSettings from '$lib/components/LocalSettings.svelte';
  import Table from '$lib/components/Table.svelte';

  /** A new game (replacing the saved one). */
  function newGame(rules: RuleSet, settings: Partial<Settings>, seed = randomId()): LocalGame {
    const human = Math.floor(Math.random() * 4);
    return new LocalGame(rules, seed, human, settings, { autosave: true });
  }

  /** Bare /play resumes the saved game; any parameter starts a new one from the parameters. */
  function openGame(): LocalGame {
    const q = page.url.searchParams;
    if (!q.size) {
      const saved = loadSave();
      if (saved) {
        try {
          return LocalGame.restore(saved);
        } catch {
          clearSave();
        }
      }
    }
    const base = q.get('preset') === 'ema' ? EMA_2025 : DEFAULT_RULES;
    const rules = makeRules(base, { length: q.get('length') === 'south' ? 'south' : 'east' });
    const settings = { botElo: parseBotElo(q.get('bots')), hints: (q.get('hints') as HintLevel) ?? 'waits' };
    return newGame(rules, settings, q.get('seed') ?? undefined);
  }

  let game = $state(openGame());
  let table: Table | undefined = $state();

  // Parameters only choose the new game; a reload should resume it, not roll another.
  onMount(() => {
    if (page.url.search) replaceState('/play', {});
  });

  function restart() {
    const settings = $state.snapshot(game.settings);
    game.destroy();
    game = newGame(game.rules, settings);
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
