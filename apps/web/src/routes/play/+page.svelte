<script lang="ts">
  import { onDestroy } from 'svelte';
  import { afterNavigate, goto, replaceState } from '$app/navigation';
  import { page } from '$app/state';
  import { DEFAULT_RULES, EMA_2025, type HintLevel, type RuleSet, makeRules } from '@mahjong/engine';
  import { LocalGame, type LocalSettings as Settings } from '$lib/game/local.svelte';
  import { clearSave, loadSave } from '$lib/game/saved';
  import { randomId } from '$lib/random';
  import { parseBotElo } from '$lib/bots';
  import { WINDS } from '@mahjong/drills/labels';
  import LocalSettings from '$lib/components/LocalSettings.svelte';
  import Table from '$lib/components/Table.svelte';
  import Title from '$lib/components/Title.svelte';

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
    const settings = { botElo: parseBotElo(q.get('bots')), hints: (q.get('hints') as HintLevel) ?? 'distance' };
    return newGame(rules, settings, q.get('seed') ?? undefined);
  }

  let game = $state(openGame());
  let table: Table | undefined = $state();

  // Parameters only choose the new game; a reload should resume it, not roll another. On a full page load the
  // router only counts as started right after the 'enter' afterNavigate callbacks, hence the microtask.
  afterNavigate(() => {
    queueMicrotask(() => {
      if (page.url.search) replaceState('/play', {});
    });
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

<Title page="{WINDS[game.view.roundWind]} {game.view.dealer + 1}" />

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
