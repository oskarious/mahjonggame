<script lang="ts">
  import { goto } from '$app/navigation';
  import { BOT_PRESETS, DEFAULT_BOT_ELO } from '$lib/bots';

  let { data } = $props();

  let preset = $state('default');
  let length = $state('east');
  let bots = $state(DEFAULT_BOT_ELO);
  let hints = $state('waits');

  function start() {
    const params = new URLSearchParams({ preset, length, bots: String(bots), hints });
    goto(`/play?${params}`);
  }
</script>

<svelte:head><title>Riichi</title></svelte:head>

<main>
  <nav class="account">
    {#if data.user}
      <a class="chip" href="/account">{data.user.name}</a>
    {:else}
      <a class="chip" href="/login">Sign in</a>
    {/if}
  </nav>

  <div class="logo" aria-hidden="true">
    <img src="/tiles/Chun.svg" alt="" />
  </div>
  <h1>Riichi</h1>
  <p class="tag">Quick riichi mahjong. One hand, portrait, no fluff.</p>

  {#if data.online}
    <a class="btn primary big online" href="/online">
      <span>Play online</span>
      <span class="elo">{data.online.rating}</span>
    </a>
    <p class="or">or</p>
  {/if}

  <form
    onsubmit={(e) => {
      e.preventDefault();
      start();
    }}
  >
    <fieldset>
      <legend>Length</legend>
      <div class="seg">
        <label class:on={length === 'east'}><input type="radio" bind:group={length} value="east" />East only</label>
        <label class:on={length === 'south'}><input type="radio" bind:group={length} value="south" />East + South</label>
      </div>
    </fieldset>

    <fieldset>
      <legend>Rules</legend>
      <div class="seg">
        <label class:on={preset === 'default'}><input type="radio" bind:group={preset} value="default" />Online</label>
        <label class:on={preset === 'ema'}><input type="radio" bind:group={preset} value="ema" />EMA 2025</label>
      </div>
    </fieldset>

    <fieldset>
      <legend>Opponents</legend>
      <div class="seg elo">
        {#each BOT_PRESETS as elo (elo)}
          <label class:on={bots === elo}><input type="radio" bind:group={bots} value={elo} />{elo}</label>
        {/each}
      </div>
    </fieldset>

    <fieldset>
      <legend>Hints</legend>
      <select bind:value={hints}>
        <option value="off">Off</option>
        <option value="distance">Distance ("3 away")</option>
        <option value="waits">+ Waiting tiles</option>
        <option value="full">+ Discard advice</option>
      </select>
    </fieldset>

    <button class="btn big" class:primary={!data.online} type="submit">Play vs bots</button>
  </form>
</main>

<style>
  main {
    max-width: 440px;
    margin: 0 auto;
    padding: 32px 18px calc(24px + env(safe-area-inset-bottom));
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  .account {
    display: flex;
    justify-content: flex-end;
    margin: -16px -4px 0;
  }
  .account .chip {
    min-height: 36px;
    padding: 0 14px;
    font-size: 0.9rem;
    color: var(--ink);
    text-decoration: none;
  }
  .logo {
    align-self: center;
    width: 64px;
    height: 84px;
    border-radius: 10px;
    background: var(--tile-face);
    box-shadow: 0 5px 0 var(--tile-edge);
    display: grid;
    place-items: center;
    rotate: -6deg;
  }
  .logo img {
    width: 80%;
  }
  h1 {
    text-align: center;
    margin: 12px 0 0;
    font-size: 2rem;
    letter-spacing: 0.02em;
  }
  .tag {
    text-align: center;
    margin: 0 0 16px;
    color: var(--ink-dim);
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 14px;
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
  .seg.elo {
    grid-template-columns: repeat(5, 1fr);
    font-variant-numeric: tabular-nums;
  }
  .big {
    min-height: 56px;
    font-size: 1.15rem;
    margin-top: 8px;
  }
  .online {
    text-decoration: none;
    margin-top: 0;
  }
  .online .elo {
    font-size: 0.85rem;
    font-weight: 600;
    opacity: 0.75;
    font-variant-numeric: tabular-nums;
  }
  .or {
    margin: 0;
    text-align: center;
    color: var(--ink-dim);
    font-size: 0.8rem;
  }
</style>
