<script lang="ts">
  import type { LocalGame } from '$lib/game/local.svelte';
  import { BOT_PRESETS } from '$lib/bots';

  interface Props {
    game: LocalGame;
    quickDiscard: boolean;
    onquick: (v: boolean) => void;
    tileLabels: boolean;
    onlabels: (v: boolean) => void;
    onclose: () => void;
    onnew: () => void;
  }
  let { game, quickDiscard, onquick, tileLabels, onlabels, onclose, onnew }: Props = $props();
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

<div class="backdrop" onclick={onclose} role="presentation">
  <div class="panel" role="dialog" aria-modal="true" aria-label="Settings" onclick={(e) => e.stopPropagation()} tabindex="-1" onkeydown={(e) => e.key === 'Escape' && onclose()}>
    <h2>Settings</h2>

    <label>
      <span>Hand hints</span>
      <select bind:value={game.settings.hints}>
        <option value="off">Off</option>
        <option value="distance">Distance ("3 away")</option>
        <option value="waits">+ Waiting tiles</option>
        <option value="full">+ Discard advice</option>
      </select>
    </label>

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
      <input type="checkbox" checked={tileLabels} onchange={(e) => onlabels(e.currentTarget.checked)} />
      <span>Numbers and letters on tiles</span>
    </label>
    <label class="check">
      <input type="checkbox" checked={quickDiscard} onchange={(e) => onquick(e.currentTarget.checked)} />
      <span>One-tap discard</span>
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
    <button class="btn primary" onclick={onclose}>Done</button>
  </div>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 40;
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }
  .panel {
    width: min(100%, 460px);
    max-height: 92dvh;
    overflow-y: auto;
    background: var(--panel);
    border-radius: 18px 18px 0 0;
    padding: 16px 16px calc(16px + env(safe-area-inset-bottom));
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  h2,
  h3 {
    margin: 0;
  }
  h3 {
    margin-top: 6px;
    font-size: 0.9rem;
    color: var(--ink-dim);
  }
  label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  label.check {
    justify-content: flex-start;
    min-height: 36px;
  }
  input[type='checkbox'] {
    width: 22px;
    height: 22px;
    min-height: 0;
    accent-color: var(--accent);
  }
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
