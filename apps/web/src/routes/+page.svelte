<script lang="ts">
  import { page } from "$app/state";
  import BotGameSheet from "$lib/components/BotGameSheet.svelte";
  import ContentShell from "$lib/components/ContentShell.svelte";
  import RankBadge from "$lib/components/RankBadge.svelte";
  import Seo from "$lib/components/Seo.svelte";
  import { type SavedGame, loadSave } from "$lib/game/saved";
  import ContinueLearning from "$lib/home/ContinueLearning.svelte";
  import LiveNow from "$lib/home/LiveNow.svelte";
  import PlayerStats from "$lib/home/PlayerStats.svelte";
  import RecentGames from "$lib/home/RecentGames.svelte";
  import { trackOwner } from "$lib/progress/client.svelte";
  import { SITE_NAME, siteOrganization } from "$lib/site";
  import DailyDiscard from "$lib/train/components/DailyDiscard.svelte";
  import { DAILY, utcDate } from "$lib/train/daily";
  import { dailyOf, dailyStreak, statsLoaded } from "$lib/train/stats.svelte";
  import { WINDS } from "@mahjong/drills/labels";
  import { onMount } from "svelte";

  let { data } = $props();

  trackOwner();

  let botSheet = $state(false);
  /** Read on mount: the page is server-rendered and the save, the date and the daily set's progress live in the browser. */
  let saved: SavedGame | null = $state(null);
  let today = $state("");
  onMount(() => {
    saved = loadSave();
    today = utcDate();
  });
  const daily = $derived(statsLoaded() && today ? dailyOf(today) : null);
  const streak = $derived(
    statsLoaded() && today ? dailyStreak(today, DAILY.length) : 0,
  );

  const origin = $derived(page.url.origin);
  const jsonld = $derived([
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: origin,
    },
    { "@context": "https://schema.org", ...siteOrganization(origin) },
  ]);
</script>

<Seo
  title="Play riichi mahjong online"
  description="Play riichi mahjong online for free: rated games against players at your level, bots, lessons and trainers. No downloads, made for your phone."
  path="/"
  type="website"
  {jsonld}
/>

<ContentShell>
  <h1>
    <img src="/brand/logo-row.svg" alt={SITE_NAME} width="280" height="51" />
  </h1>

  {#if !data.user}
    <a class="btn primary play" href="/signup?next=/online">Play online</a>
  {:else if data.online}
    <a class="btn primary play" href="/online">
      <span>Play online</span>
      <span class="elo"><RankBadge rating={data.online.rating} pill /></span>
    </a>
  {:else}
    <!-- The game server is down: bots are the game on offer. -->
    <button
      class="btn primary play"
      type="button"
      onclick={() => (botSheet = true)}>Play vs bots</button
    >
  {/if}
  <LiveNow players={data.playing} />

  <div class="pair">
    <button class="card" type="button" onclick={() => (botSheet = true)}>
      <span class="name">Bots</span>
      <span class="what">
        {#if saved}Continue {WINDS[saved.round.wind]}
          {saved.round.dealer + 1}{:else}No account needed{/if}
      </span>
    </button>
    <a class="card" href="/train">
      <span class="name">Train</span>
      <span class="what">Endless drills</span>
    </a>
  </div>

  <ContinueLearning />

  <a class="card daily" href="/train/daily">
    <span class="name">Daily set</span>
    <span class="what">A mix of every drill</span>
    <span class="facts">
      {#if daily}<span><b>{daily.length}</b>/{DAILY.length}</span>{/if}
      {#if streak}<span><b>{streak}</b> days</span>{/if}
    </span>
  </a>

  {#key data.discard.date}
    <DailyDiscard {...data.discard} />
  {/key}

  <!-- New sections, one after another for now: arrange freely. -->
  {#if data.me}
    <PlayerStats rating={data.me.rating} week={data.me.week} {today} />
    <RecentGames games={data.me.recent} />
  {/if}
</ContentShell>

{#if botSheet}
  <BotGameSheet {saved} onclose={() => (botSheet = false)} />
{/if}

<style>
  h1 {
    margin: 24px 0 8px !important;
    display: flex;
    justify-content: center;
  }
  h1 img {
    width: min(280px, 100%);
    height: auto;
  }
  .play {
    width: 100%;
    min-height: 60px;
    margin-top: 10px;
    font-size: 1.25rem;
    text-decoration: none;
  }
  .play .elo {
    font-size: 0.85rem;
    font-weight: 600;
    opacity: 0.75;
    font-variant-numeric: tabular-nums;
  }
  .pair {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin: 8px 0;
  }
  .card {
    display: grid;
    grid-template-columns: 1fr auto;
    align-content: center;
    gap: 2px 10px;
    padding: 14px;
    border-radius: var(--radius);
    background: var(--panel);
    color: var(--ink);
    font: inherit;
    line-height: 1.4;
    text-align: left;
    text-decoration: none;
    cursor: pointer;
  }
  .card.daily {
    background: var(--surface-me);
    margin-top: 8px;
  }
  @media (hover: hover) {
    .card:hover {
      filter: brightness(1.1);
    }
  }
  .name {
    font-weight: 700;
    font-size: 1.1rem;
  }
  .what {
    grid-column: 1;
    color: var(--ink-dim);
    font-size: 0.9rem;
  }
  .facts {
    grid-column: 2;
    grid-row: 1 / 3;
    align-self: center;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    font-size: 0.8rem;
    color: var(--ink-dim);
    font-variant-numeric: tabular-nums;
  }
  .facts b {
    color: var(--ink);
  }
</style>
