<script lang="ts">
  // The frame of every page but the game (home, Learn, Train): a sticky header with the sections, the call to action
  // and the account (sign in for guests), and one reading column.
  import type { Snippet } from 'svelte';
  import { page } from '$app/state';
  import Cta from '$lib/learn/components/Cta.svelte';
  import { tileset } from '$lib/tileset.svelte';

  let { children }: { children: Snippet } = $props();

  const SECTIONS = [
    { href: '/learn', label: 'Learn' },
    { href: '/train', label: 'Train' },
  ];
  const user = $derived(page.data.user as { name: string } | null | undefined);
  const here = (href: string) => page.url.pathname === href || page.url.pathname.startsWith(`${href}/`);
</script>

<div class="content" style:--tile-ratio={tileset().ratio}>
  <header>
    <a class="home" href="/" aria-label="Riichi Arena home"><img src="/brand/wordmark.svg" alt="" /></a>
    {#each SECTIONS as s (s.href)}
      <a class="section" class:here={here(s.href)} href={s.href} aria-current={here(s.href) ? 'page' : undefined}
        >{s.label}</a
      >
    {/each}
    <span class="cta"><Cta variant="header" /></span>
    <a class="account" href={user ? '/account' : '/login'} aria-label={user ? `Account: ${user.name}` : 'Sign in'}>
      <svg viewBox="0 0 24 24" aria-hidden="true"
        ><circle cx="12" cy="8.5" r="3.75" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></svg
      >
    </a>
  </header>
  <main>
    {@render children()}
  </main>
</div>

<style>
  .content {
    min-height: 100dvh;
  }
  header {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 10px 10px 16px;
    padding-top: calc(10px + env(safe-area-inset-top));
    background: color-mix(in srgb, var(--bg) 92%, transparent);
    backdrop-filter: blur(6px);
    border-bottom: 1px solid var(--line);
  }
  .home img {
    display: block;
    height: 20px;
  }
  .section {
    color: var(--ink-dim);
    font-weight: 600;
    text-decoration: none;
  }
  .section.here {
    color: var(--ink);
  }
  .cta {
    margin-left: auto;
  }
  .account {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    margin-left: -4px;
    color: var(--ink-dim);
  }
  .account svg {
    width: 24px;
    height: 24px;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
  }
  @media (hover: hover) {
    .account:hover {
      color: var(--ink);
    }
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
