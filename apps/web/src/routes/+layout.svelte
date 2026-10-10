<script lang="ts">
  import '@fontsource-variable/bricolage-grotesque/opsz.css';
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { armSound } from '$lib/audio/player';
  import BgPattern from '$lib/components/BgPattern.svelte';
  import FullscreenButton from '$lib/components/FullscreenButton.svelte';
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

<!-- Content pages (home, Learn, Train) set `contentPage`: they have no fullscreen toggle. Metadata comes from each page
     (`Seo`, or `Title` on app pages). -->
<BgPattern />
{@render children()}
{#if !page.data.contentPage}<FullscreenButton />{/if}
