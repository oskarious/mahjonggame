<script lang="ts">
  import { page as current } from '$app/state';
  import { OG_IMAGE, SITE_DESCRIPTION, SITE_NAME } from '$lib/site';

  /**
   * The title and default link-preview tags of an app page (play, online, account, admin). Pages for search engines
   * use `Seo` instead. `page` is the page's own part of the title; the site name is appended (or stands alone).
   */
  let { page }: { page?: string } = $props();

  const full = $derived(page ? `${page} · ${SITE_NAME}` : SITE_NAME);
  // Scrapers need absolute URLs.
  const origin = $derived(current.url.origin);
</script>

<svelte:head>
  <title>{full}</title>
  <meta name="description" content={SITE_DESCRIPTION} />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content={SITE_NAME} />
  <meta property="og:title" content={full} />
  <meta property="og:description" content={SITE_DESCRIPTION} />
  <meta property="og:url" content={origin + current.url.pathname} />
  <meta property="og:image" content={origin + OG_IMAGE} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={full} />
</svelte:head>
