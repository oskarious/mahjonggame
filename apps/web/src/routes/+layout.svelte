<script lang="ts">
  import '@fontsource-variable/bricolage-grotesque/opsz.css';
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { armSound } from '$lib/audio/player';
  import BgPattern from '$lib/components/BgPattern.svelte';
  import FullscreenButton from '$lib/components/FullscreenButton.svelte';
  import { SITE_NAME } from '$lib/components/Title.svelte';
  import { idle, warmTiles } from '$lib/tile-warmup';
  import { tileset } from '$lib/tileset.svelte';

  let { children } = $props();

  // Assets ready before a game needs them: the tap that starts a game already unlocks audio, and the chosen
  // tileset's artwork is fetched and decoded in idle time (again after a tileset switch).
  onMount(armSound);
  $effect(() => {
    const set = tileset();
    return idle(() => warmTiles(set));
  });
</script>

<!-- Link previews: scrapers need an absolute image URL. Content pages (Learn) set `contentPage`: they bring their own
     metadata and have no fullscreen toggle. -->
<svelte:head>
  {#if !page.data.contentPage}
  <meta property="og:site_name" content={SITE_NAME} />
  <meta property="og:title" content={SITE_NAME} />
  <meta property="og:description" content="Simply riichi mahjong" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="{page.url.origin}/brand/og.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  {/if}
</svelte:head>

<BgPattern />
{@render children()}
{#if !page.data.contentPage}<FullscreenButton />{/if}
