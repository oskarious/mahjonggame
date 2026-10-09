<script lang="ts">
  import { page } from '$app/state';
  import { hasProgress, progressLoaded } from './client.svelte';

  /** For guests with progress this visit: it isn't kept unless they sign up (back to this page, the visit claimed). */
  const show = $derived(!page.data.user && progressLoaded() && hasProgress());
  const next = $derived(encodeURIComponent(page.url.pathname + page.url.search));
</script>

{#if show}
  <aside class="nudge" aria-label="Progress">
    <span class="label">Not saved</span>
    <a class="btn ghost" href="/signup?next={next}">Sign up to keep it</a>
  </aside>
{/if}

<style>
  .nudge {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 12px 0 0;
  }
  .label {
    flex: 1;
    color: var(--ink-dim);
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .btn {
    min-height: 40px;
    font-size: 0.9rem;
    text-decoration: none;
    white-space: nowrap;
  }
</style>
