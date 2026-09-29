<script lang="ts">
  import { goto } from "$app/navigation";
  import { BOT_PRESETS, DEFAULT_BOT_ELO } from "$lib/bots";
  import Title, { SITE_NAME } from "$lib/components/Title.svelte";
  import { type SavedGame, loadSave } from "$lib/game/saved";
  import { WINDS } from "$lib/labels";
  import { onMount } from "svelte";

  let { data } = $props();

  let preset = $state("default");
  let length = $state("east");
  let bots = $state(DEFAULT_BOT_ELO);
  let hints = $state("waits");
  /** Read on mount: the page is server-rendered and the save lives in the browser. */
  let saved: SavedGame | null = $state(null);

  onMount(() => (saved = loadSave()));

  function start() {
    const params = new URLSearchParams({
      preset,
      length,
      bots: String(bots),
      hints,
    });
    goto(`/play?${params}`);
  }
</script>

<Title />

<main>
  <nav class="account">
    {#if data.user}
      <a class="chip" href="/account">{data.user.name}</a>
    {:else}
      <a class="chip" href="/login">Sign in</a>
    {/if}
  </nav>

  <h1><img src="/brand/logo-row.svg" alt={SITE_NAME} /></h1>

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
        <label class:on={length === "east"}
          ><input type="radio" bind:group={length} value="east" />East only</label
        >
        <label class:on={length === "south"}
          ><input type="radio" bind:group={length} value="south" />East + South</label
        >
      </div>
    </fieldset>

    <fieldset>
      <legend>Rules</legend>
      <div class="seg">
        <label class:on={preset === "default"}
          ><input
            type="radio"
            bind:group={preset}
            value="default"
          />Online</label
        >
        <label class:on={preset === "ema"}
          ><input type="radio" bind:group={preset} value="ema" />EMA 2025</label
        >
      </div>
    </fieldset>

    <fieldset>
      <legend>Opponents</legend>
      <div class="seg elo">
        {#each BOT_PRESETS as elo (elo)}
          <label class:on={bots === elo}
            ><input type="radio" bind:group={bots} value={elo} />{elo}</label
          >
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

    <div class="start">
      {#if saved}
        <a class="btn big" class:primary={!data.online} href="/play">
          <span>Continue</span>
          <span class="round"
            >{WINDS[saved.round.wind]} {saved.round.dealer + 1}</span
          >
        </a>
      {/if}
      <button
        class="btn big"
        class:primary={!data.online && !saved}
        type="submit"
      >
        {saved ? "New game" : "Play vs bots"}
      </button>
    </div>
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
  h1 {
    margin: 16px 0 4px;
    display: flex;
    justify-content: center;
  }
  h1 img {
    width: min(280px, 100%);
    height: auto;
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
  .start {
    display: flex;
    gap: 8px;
  }
  .start .btn {
    flex: 1;
    text-decoration: none;
  }
  .online .elo,
  .start .round {
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
