<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';
  import BgPattern from '$lib/components/BgPattern.svelte';
  import FullscreenButton from '$lib/components/FullscreenButton.svelte';
  import { SITE_NAME } from '$lib/components/Title.svelte';

  let { children } = $props();
</script>

<!-- Link previews: scrapers need an absolute image URL. -->
<svelte:head>
  <meta property="og:site_name" content={SITE_NAME} />
  <meta property="og:title" content={SITE_NAME} />
  <meta property="og:description" content="Simply riichi mahjong" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="{page.url.origin}/brand/og.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<BgPattern />
{@render children()}
<FullscreenButton />
