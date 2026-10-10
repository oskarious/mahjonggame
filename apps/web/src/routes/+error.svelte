<script lang="ts">
  import { page } from '$app/state';
  import ContentShell from '$lib/components/ContentShell.svelte';
  import Seo from '$lib/components/Seo.svelte';

  const missing = $derived(page.status === 404);
  const title = $derived(missing ? 'Page not found' : 'Something went wrong');
</script>

<Seo
  {title}
  description={missing ? 'This page does not exist.' : 'The page could not be loaded.'}
  path={page.url.pathname}
  type="website"
  noindex
/>

<ContentShell>
  <h1>{title}</h1>
  <p class="status">{page.status}</p>
  <p class="links">
    <a class="btn primary" href="/">Home</a>
    <a class="btn" href="/learn">Learn to play</a>
  </p>
</ContentShell>

<style>
  .status {
    color: var(--ink-dim);
    font-variant-numeric: tabular-nums;
  }
  .links {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .links a {
    text-decoration: none;
  }
</style>
