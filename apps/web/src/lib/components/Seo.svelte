<script lang="ts">
  import { page } from '$app/state';
  import { OG_IMAGE, SITE_NAME } from '$lib/site';

  interface Props {
    /** Page title; the site name is appended. */
    title: string;
    description: string;
    /** Absolute path of this page (canonical). */
    path: string;
    type?: 'website' | 'article';
    /** JSON-LD objects (schema.org). */
    jsonld?: object[];
    /** Keep the page out of search results (it still gets a title and link-preview tags). */
    noindex?: boolean;
  }
  let { title, description, path, type = 'article', jsonld = [], noindex = false }: Props = $props();

  // With adapter-node, the origin is ORIGIN in production.
  const origin = $derived(page.url.origin);
  const url = $derived(origin + path);
  const full = $derived(`${title} · ${SITE_NAME}`);
  const image = $derived(origin + OG_IMAGE);
  // JSON-LD blocks. "<" is escaped so no string can close the tag, and the tag itself is assembled so this file
  // never contains a literal script tag (the Svelte preprocessor would take it for the component's own).
  const LT = String.fromCharCode(60);
  const ldTag = (o: object) =>
    `${LT}script type="application/ld+json">${JSON.stringify(o).replaceAll(LT, '\\u003c')}${LT}/script>`;
  const ld = $derived(jsonld.map(ldTag));
</script>

<svelte:head>
  <title>{full}</title>
  <meta name="description" content={description} />
  {#if noindex}<meta name="robots" content="noindex" />{/if}
  <link rel="canonical" href={url} />
  <meta property="og:type" content={type} />
  <meta property="og:site_name" content={SITE_NAME} />
  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={url} />
  <meta property="og:image" content={image} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={image} />
  {#each ld as json, i (i)}
    <!-- eslint-disable-next-line svelte/no-at-html-tags -- our own JSON-LD, with "<" escaped -->
    {@html json}
  {/each}
</svelte:head>
