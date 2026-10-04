<script lang="ts">
  import Cta from '$lib/learn/components/Cta.svelte';
  import { tileset } from '$lib/tileset.svelte';

  let { children } = $props();
</script>

<div class="learn" style:--tile-ratio={tileset().ratio}>
  <header>
    <a class="home" href="/" aria-label="Riichi Arena home"><img src="/brand/wordmark.svg" alt="" /></a>
    <a class="course" href="/learn">Learn</a>
    <span class="cta"><Cta variant="header" /></span>
  </header>
  <main>
    {@render children()}
  </main>
</div>

<style>
  .learn {
    min-height: 100dvh;
  }
  header {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 10px 16px;
    padding-top: calc(10px + env(safe-area-inset-top));
    background: color-mix(in srgb, var(--bg) 92%, transparent);
    backdrop-filter: blur(6px);
    border-bottom: 1px solid var(--line);
  }
  .home img {
    display: block;
    height: 20px;
  }
  .course {
    color: var(--ink);
    font-weight: 600;
    text-decoration: none;
  }
  .cta {
    margin-left: auto;
  }
  main {
    /* Tile rows measure their width against this (see --col in app.css). */
    container-type: inline-size;
    max-width: 520px;
    margin: 0 auto;
    padding: 8px 16px calc(32px + env(safe-area-inset-bottom));
    line-height: 1.55;
  }
  main :global(h1) {
    font-size: 1.6rem;
    line-height: 1.2;
    margin: 18px 0 8px;
  }
  main :global(h2) {
    font-size: 1.25rem;
    line-height: 1.25;
    margin: 28px 0 6px;
  }
  main :global(h3) {
    font-size: 1.05rem;
    margin: 20px 0 4px;
  }
  main :global(p) {
    margin: 0.6em 0;
  }
  main :global(ul),
  main :global(ol) {
    padding-left: 1.3em;
  }
  main :global(li) {
    margin: 0.25em 0;
  }
  main :global(a) {
    color: var(--ink);
  }
</style>
