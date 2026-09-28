<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HintLevel } from '@mahjong/engine';

  interface Props {
    hints: HintLevel;
    /** Highest level allowed (online: decided by the server from the rating). */
    maxHints?: HintLevel;
    onhints: (level: HintLevel) => void;
    quickDiscard: boolean;
    onquick: (v: boolean) => void;
    tileLabels: boolean;
    onlabels: (v: boolean) => void;
    onclose: () => void;
    /** Leave the game (the play screen has no other way back). */
    onhome: () => void;
    /** Extra controls (offline: bots, debug). */
    children?: Snippet;
  }
  let { hints, maxHints = 'full', onhints, quickDiscard, onquick, tileLabels, onlabels, onclose, onhome, children }: Props =
    $props();

  const LEVELS: { value: HintLevel; label: string }[] = [
    { value: 'off', label: 'Off' },
    { value: 'distance', label: 'Distance ("3 away")' },
    { value: 'waits', label: '+ Waiting tiles' },
    { value: 'full', label: '+ Discard advice' },
  ];
  const ORDER: HintLevel[] = ['off', 'distance', 'waits', 'full'];
  const allowed = $derived(LEVELS.filter((l) => ORDER.indexOf(l.value) <= ORDER.indexOf(maxHints)));
</script>

<div class="backdrop" onclick={onclose} role="presentation">
  <div
    class="panel"
    role="dialog"
    aria-modal="true"
    aria-label="Settings"
    onclick={(e) => e.stopPropagation()}
    tabindex="-1"
    onkeydown={(e) => e.key === 'Escape' && onclose()}
  >
    <h2>Settings</h2>

    <label>
      <span>Hand hints</span>
      <select value={hints} onchange={(e) => onhints(e.currentTarget.value as HintLevel)}>
        {#each allowed as l (l.value)}<option value={l.value}>{l.label}</option>{/each}
      </select>
    </label>

    <label class="check">
      <input type="checkbox" checked={tileLabels} onchange={(e) => onlabels(e.currentTarget.checked)} />
      <span>Corner labels on tiles</span>
    </label>
    <label class="check">
      <input type="checkbox" checked={quickDiscard} onchange={(e) => onquick(e.currentTarget.checked)} />
      <span>One-click discard (mouse)</span>
    </label>

    {@render children?.()}

    <button class="btn ghost" onclick={onhome}>Leave game</button>
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
  h2 {
    margin: 0;
  }
  .panel :global(h3) {
    margin: 6px 0 0;
    font-size: 0.9rem;
    color: var(--ink-dim);
  }
  .panel :global(label) {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }
  .panel :global(label.check) {
    justify-content: flex-start;
    min-height: 36px;
  }
  .panel :global(input[type='checkbox']) {
    width: 22px;
    height: 22px;
    min-height: 0;
    accent-color: var(--accent);
  }
</style>
