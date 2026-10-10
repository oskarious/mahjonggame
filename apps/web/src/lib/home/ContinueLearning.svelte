<script lang="ts">
  import { dev } from '$app/environment';
  import { exercisesOf } from '$lib/learn/content';
  import { completed } from '$lib/learn/progress.svelte';
  import { published } from '$lib/learn/registry';
  import { progressLoaded } from '$lib/progress/client.svelte';

  /**
   * The home page's way into Learn: the reader's next lesson, the first one not completed (the first lesson until
   * progress has loaded); once the course is done, the course index. The page calls `trackOwner()`.
   */
  const lessons = published(dev);
  const variantCounts = (slug: string) =>
    Object.fromEntries(Object.entries(exercisesOf(slug)).map(([id, set]) => [id, set.length]));
  const index = $derived(
    progressLoaded() ? lessons.findIndex((l) => !completed(l.slug, variantCounts(l.slug))) : 0,
  );
  const lesson = $derived(index < 0 ? null : lessons[index]);
</script>

{#if lesson}
  <a class="card" href="/learn/{lesson.slug}">
    <span class="label">{index === 0 ? 'Start learning' : 'Continue learning'}</span>
    <span class="name">{lesson.title}</span>
    <span class="what">{lesson.summary}</span>
    <span class="facts"><b>{index + 1}</b>/{lessons.length}</span>
    <span class="bar" aria-hidden="true"><span style:width="{(100 * index) / lessons.length}%"></span></span>
  </a>
{:else}
  <a class="card" href="/learn">
    <span class="label">Learn</span>
    <span class="name">Course complete</span>
    <span class="what">Revisit any lesson</span>
    <span class="facts"><b>{lessons.length}</b>/{lessons.length}</span>
    <span class="bar" aria-hidden="true"><span style:width="100%"></span></span>
  </a>
{/if}

<style>
  .card {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 2px 10px;
    margin: 8px 0;
    padding: 14px;
    border-radius: var(--radius);
    background: var(--panel);
    color: var(--ink);
    line-height: 1.4;
    text-decoration: none;
  }
  @media (hover: hover) {
    .card:hover {
      filter: brightness(1.1);
    }
  }
  .label {
    grid-column: 1;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--ink-dim);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .name,
  .what {
    grid-column: 1 / 3;
  }
  .name {
    font-weight: 700;
    font-size: 1.1rem;
  }
  .what {
    color: var(--ink-dim);
    font-size: 0.9rem;
  }
  .facts {
    grid-column: 2;
    grid-row: 1;
    align-self: baseline;
    font-size: 0.8rem;
    color: var(--ink-dim);
    font-variant-numeric: tabular-nums;
  }
  .facts b {
    color: var(--ink);
  }
  .bar {
    grid-column: 1 / 3;
    height: 3px;
    margin-top: 8px;
    border-radius: 2px;
    background: var(--panel-2);
  }
  .bar span {
    display: block;
    height: 100%;
    border-radius: 2px;
    background: var(--accent);
  }
</style>
