<script lang="ts">
  import { page } from '$app/state';
  import { BEGINNER_PLAY } from '$lib/learn/play';

  /**
   * Play on the site: sign up (guests) or play online (signed in), and a bot game that needs no account.
   * header: one small button; inline: a quiet row under each lesson part (the part's Next stays the primary button);
   * block: the full call to action at the end of a lesson or page.
   */
  let { variant = 'block' }: { variant?: 'header' | 'inline' | 'block' } = $props();

  const user = $derived(page.data.user as { name: string } | null | undefined);
  const primary = $derived(
    user ? { href: '/online', text: 'Play online' } : { href: '/signup?next=/online', text: 'Sign up and play' },
  );
</script>

{#if variant === 'header'}
  <a class="btn primary compact" href={primary.href}>{user ? 'Play' : 'Sign up'}</a>
{:else if variant === 'inline'}
  <aside class="inline" aria-label="Play">
    <span>Try it in a game</span>
    <a class="btn" href={primary.href}>{primary.text}</a>
    <a class="btn" href={BEGINNER_PLAY} rel="nofollow">Play a bot</a>
  </aside>
{:else}
  <section class="cta" aria-label="Play">
    <p class="pitch">
      {#if user}Put it into practice: a rated game against players at your level.{:else}Put it into practice. Free
        account, rated games, no downloads.{/if}
    </p>
    <a class="btn primary big" href={primary.href}>{primary.text}</a>
    <a class="btn big" href={BEGINNER_PLAY} rel="nofollow">{user ? 'Play a bot' : 'Play a bot now'}</a>
  </section>
{/if}

<style>
  .cta {
    background: var(--panel);
    border-radius: var(--radius);
    padding: 16px 14px;
    margin: 24px 0 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .pitch {
    margin: 0 0 4px;
    font-weight: 600;
  }
  .big {
    min-height: 52px;
    font-size: 1.05rem;
    text-decoration: none;
  }
  .inline {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 8px;
    margin: 14px 0 0;
    padding: 10px 12px;
    border-radius: var(--radius);
    background: var(--panel);
  }
  .inline span {
    flex: 1 0 100%;
    color: var(--ink-dim);
    font-size: 0.85rem;
  }
  .inline .btn {
    flex: 1;
    min-height: 40px;
    font-size: 0.9rem;
    text-decoration: none;
    white-space: nowrap;
  }
  .compact {
    min-height: 36px;
    padding: 4px 14px;
    text-decoration: none;
    white-space: nowrap;
  }
</style>
