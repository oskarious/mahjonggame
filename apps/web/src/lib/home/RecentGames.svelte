<script lang="ts">
  import type { RecentGame } from '$lib/server/home';

  /** A signed-in player's last rated games: placement, length, final points and rating change. Hidden when none. */
  let { games }: { games: RecentGame[] } = $props();

  const PLACE = ['1st', '2nd', '3rd', '4th'];
  const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
  const ago = (iso: string) => {
    const h = Math.floor((Date.now() - Date.parse(iso)) / 3_600_000);
    return h < 1 ? 'now' : h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;
  };
</script>

{#if games.length}
  <section class="recent" aria-labelledby="recent-title">
    <h2 id="recent-title">Recent games</h2>
    <ol>
      {#each games as g (g.id)}
        <li>
          <span class="place">{g.placement ? PLACE[g.placement - 1] : '–'}</span>
          <span class="format">{g.format === 'east' ? 'East' : 'East + South'}</span>
          <span class="points">{g.points?.toLocaleString('en') ?? ''}</span>
          <span class="change" class:up={(g.change ?? 0) > 0}>{g.change === null ? '' : signed(g.change)}</span>
          <span class="ago">{ago(g.endedAt)}</span>
        </li>
      {/each}
    </ol>
  </section>
{/if}

<style>
  .recent {
    margin: 18px 0 8px;
  }
  h2 {
    margin: 0 0 6px !important;
    font-size: 0.8rem !important;
    font-weight: 600;
    color: var(--ink-dim);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  ol {
    list-style: none;
    padding: 0 !important;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  li {
    display: grid;
    grid-template-columns: 2.6em 1fr auto 3.2em 2.4em;
    align-items: baseline;
    gap: 8px;
    margin: 0 !important;
    padding: 10px 12px;
    border-radius: var(--radius);
    background: var(--panel);
    font-variant-numeric: tabular-nums;
  }
  .place {
    font-weight: 700;
  }
  .format,
  .ago {
    color: var(--ink-dim);
    font-size: 0.85rem;
  }
  .points,
  .change,
  .ago {
    text-align: right;
  }
  .change {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--danger);
  }
  .change.up {
    color: var(--ok);
  }
</style>
