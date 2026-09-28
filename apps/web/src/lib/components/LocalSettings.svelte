<script lang="ts">
  import type { LocalGame } from '$lib/game/local.svelte';
  import { BOT_PRESETS } from '$lib/bots';

  interface Props {
    game: LocalGame;
    onnew: () => void;
  }
  let { game, onnew }: Props = $props();
  let copied = $state(false);

  async function copyLog() {
    try {
      await navigator.clipboard.writeText(game.exportLog());
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch {
      prompt('Copy the game log:', game.exportLog());
    }
  }
</script>

<label>
  <span>Bots</span>
  <select bind:value={game.settings.botElo}>
    {#each BOT_PRESETS as elo (elo)}<option value={elo}>{elo}</option>{/each}
  </select>
</label>

<label>
  <span>Bot speed</span>
  <select bind:value={game.settings.botDelay} onchange={() => game.poke()}>
    <option value={120}>Fast</option>
    <option value={450}>Normal</option>
    <option value={900}>Slow</option>
  </select>
</label>

<label class="check">
  <input type="checkbox" bind:checked={game.settings.autoRiichiDiscard} onchange={() => game.poke()} />
  <span>Auto-discard after riichi</span>
</label>
<label class="check">
  <input type="checkbox" bind:checked={game.settings.skipCalls} onchange={() => game.poke()} />
  <span>Skip calls (still asks for ron)</span>
</label>

<h3>Debug</h3>
<label class="check">
  <input type="checkbox" bind:checked={game.settings.reveal} />
  <span>Show bots' hands</span>
</label>
<label class="check">
  <input type="checkbox" bind:checked={game.settings.autoplay} onchange={() => game.poke()} />
  <span>Autoplay (a bot plays for you)</span>
</label>
<p class="meta">
  Rules: {game.rules.id} · {game.rules.length === 'east' ? 'East only' : 'East + South'}<br />
  Seed: <code>{game.seed}</code> · {game.log.length} actions
</p>
<div class="row">
  <button class="btn ghost" onclick={copyLog}>{copied ? 'Copied!' : 'Copy game log'}</button>
  <button class="btn ghost" onclick={onnew}>New game</button>
</div>

<style>
  .meta {
    margin: 0;
    font-size: 0.8rem;
    color: var(--ink-dim);
    word-break: break-all;
  }
  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
</style>
