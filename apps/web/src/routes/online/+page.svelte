<script lang="ts">
  import { onDestroy } from 'svelte';
  import { goto } from '$app/navigation';
  import type { HintLevel } from '@mahjong/engine';
  import type { Format } from '@mahjong/protocol';
  import { RemoteGame } from '$lib/game/remote.svelte';
  import { WINDS } from '$lib/labels';
  import Table from '$lib/components/Table.svelte';
  import Title from '$lib/components/Title.svelte';

  const HINTS_KEY = 'riichi:onlineHints';
  function readHints(): HintLevel {
    try {
      const v = localStorage.getItem(HINTS_KEY);
      return v === 'off' || v === 'distance' || v === 'waits' || v === 'full' ? v : 'full';
    } catch {
      return 'full';
    }
  }
  let hints: HintLevel = $state(readHints());
  function setHints(level: HintLevel) {
    hints = level;
    game.setHints(level);
    try {
      localStorage.setItem(HINTS_KEY, level);
    } catch {
      /* storage unavailable */
    }
  }

  // Initial level only; later changes go through setHints.
  const game = new RemoteGame(readHints());
  const AUTO_KEY = 'riichi:autoRiichi';
  const SKIP_KEY = 'riichi:skipCalls';
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
  game.autoRiichiDiscard = readFlag(AUTO_KEY, true);
  game.skipCalls = readFlag(SKIP_KEY, false);
  function setAuto(v: boolean) {
    game.autoRiichiDiscard = v;
    writeFlag(AUTO_KEY, v);
  }
  function setSkip(v: boolean) {
    game.skipCalls = v;
    writeFlag(SKIP_KEY, v);
  }
  let format: Format = $state('east');
  let table: Table | undefined = $state();

  // Waiting time, ticking while queued.
  let now = $state(Date.now());
  $effect(() => {
    if (game.status !== 'queued') return;
    const id = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(id);
  });
  const waited = $derived(game.queue ? Math.max(0, Math.floor((now - game.queue.since) / 1000)) : 0);
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // The server clamps hints to what the rating allows; mirror that in the settings choices.
  const maxHints = $derived.by((): HintLevel => {
    const r = game.rating?.rating ?? 1000;
    return r < 1100 ? 'waits' : r < 1300 ? 'distance' : 'off';
  });

  function again() {
    game.clearGame();
    table?.reset();
  }

  onDestroy(() => game.destroy());

  const inGame = $derived((game.status === 'playing' || game.status === 'ended') && game.hasView);
  const title = $derived(inGame ? `${WINDS[game.view.roundWind]} ${game.view.dealer + 1}` : 'Online');
</script>

<Title page={title} />

{#if inGame}
  <Table
    bind:this={table}
    {game}
    {hints}
    {maxHints}
    onhints={setHints}
    players={game.info?.players ?? null}
    deadlineAt={game.deadlineAt}
    bank={game.bank}
    countdownUntil={game.countdownUntil}
    ratings={game.end?.ratings ?? null}
    onagain={again}
    onhome={() => goto('/')}
  >
    {#snippet settings()}
      <label class="check">
        <input type="checkbox" checked={game.autoRiichiDiscard} onchange={(e) => setAuto(e.currentTarget.checked)} />
        <span>Auto-discard after riichi</span>
      </label>
      <label class="check">
        <input type="checkbox" checked={game.skipCalls} onchange={(e) => setSkip(e.currentTarget.checked)} />
        <span>Skip calls (still asks for ron)</span>
      </label>
    {/snippet}
  </Table>
{:else}
  <main class="page lobby">
    <a class="back" href="/" aria-label="Home">←</a>

    {#if game.status === 'takenOver'}
      <p class="note">Playing in another tab or device.</p>
      <button class="btn primary big" onclick={() => game.reconnect()}>Play here</button>
    {:else if game.status === 'queued'}
      <div class="waiting" role="status">
        <span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="time">{mmss(waited)}</span>
      </div>
      <button class="btn ghost big" onclick={() => game.leaveQueue()}>Cancel</button>
    {:else if game.status === 'idle' || game.status === 'ended'}
      {#if game.rating}
        <p class="me"><strong>{game.user?.name}</strong><span class="elo">{game.rating.rating}</span></p>
      {/if}
      <fieldset>
        <legend>Length</legend>
        <div class="seg">
          <label class:on={format === 'east'}><input type="radio" bind:group={format} value="east" />East only</label>
          <label class:on={format === 'south'}><input type="radio" bind:group={format} value="south" />East + South</label>
        </div>
      </fieldset>
      <button class="btn primary big" onclick={() => game.joinQueue(format)}>Play</button>
      {#if game.error}<p class="form-error" role="alert">{game.error}</p>{/if}
    {:else}
      <div class="waiting" role="status" aria-label="Connecting">
        <span class="dots" aria-hidden="true"><i></i><i></i><i></i></span>
      </div>
    {/if}
  </main>
{/if}

<style>
  .lobby {
    min-height: 100dvh;
    justify-content: center;
  }
  .back {
    position: absolute;
    top: calc(12px + env(safe-area-inset-top));
    left: 12px;
    color: var(--ink-dim);
    text-decoration: none;
    font-size: 1.4rem;
    min-width: 44px;
    min-height: 44px;
    display: grid;
    place-items: center;
  }
  .me {
    margin: 0 0 8px;
    display: flex;
    justify-content: center;
    align-items: baseline;
    gap: 10px;
  }
  .me .elo {
    color: var(--ink-dim);
    font-variant-numeric: tabular-nums;
  }
  fieldset {
    border: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  legend {
    font-size: 0.8rem;
    color: var(--ink-dim);
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .big {
    min-height: 56px;
    font-size: 1.15rem;
  }
  .note {
    margin: 0;
    text-align: center;
    color: var(--ink-dim);
  }
  .waiting {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    padding: 24px 0;
    font-variant-numeric: tabular-nums;
  }
  .time {
    font-size: 1.6rem;
    color: var(--ink-dim);
  }
  .dots {
    display: flex;
    gap: 8px;
  }
  .dots i {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--accent);
    animation: pulse 1.2s infinite ease-in-out;
  }
  .dots i:nth-child(2) {
    animation-delay: 0.2s;
  }
  .dots i:nth-child(3) {
    animation-delay: 0.4s;
  }
  @keyframes pulse {
    0%,
    80%,
    100% {
      opacity: 0.25;
      transform: scale(0.8);
    }
    40% {
      opacity: 1;
      transform: scale(1);
    }
  }
</style>
