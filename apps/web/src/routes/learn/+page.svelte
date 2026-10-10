<script lang="ts">
  import { dev } from '$app/environment';
  import { page } from '$app/state';
  import Cta from '$lib/learn/components/Cta.svelte';
  import Seo from '$lib/components/Seo.svelte';
  import { exercisesOf } from '$lib/learn/content';
  import { completed } from '$lib/learn/progress.svelte';
  import { progressLoaded, trackOwner } from '$lib/progress/client.svelte';
  import ProgressNudge from '$lib/progress/ProgressNudge.svelte';
  import { REFERENCE, UNITS, published } from '$lib/learn/registry';
  import { siteOrganization } from '$lib/site';

  const lessons = published(dev);
  trackOwner();
  const variantCounts = (slug: string) =>
    Object.fromEntries(Object.entries(exercisesOf(slug)).map(([id, set]) => [id, set.length]));
  const done = (slug: string) => progressLoaded() && completed(slug, variantCounts(slug));
  /** The first lesson not completed: where to continue. */
  const next = $derived(progressLoaded() ? lessons.find((l) => !done(l.slug))?.slug : undefined);

  /** Rough time to work through the course: a few minutes per lesson part (ISO 8601 duration). */
  const MINUTES_PER_PART = 4;
  const parts = lessons.reduce((n, l) => n + Math.max(1, Object.keys(exercisesOf(l.slug)).length), 0);
  const workload = `PT${Math.round((parts * MINUTES_PER_PART) / 60)}H`;

  const origin = $derived(page.url.origin);
  const jsonld = $derived([
    {
      '@context': 'https://schema.org',
      '@type': 'Course',
      name: 'Learn riichi mahjong',
      description:
        'A free, interactive riichi mahjong course from the tiles to scoring and strategy, based on the EMA 2025 rules.',
      url: `${origin}/learn`,
      inLanguage: 'en',
      isAccessibleForFree: true,
      provider: siteOrganization(origin),
      offers: { '@type': 'Offer', category: 'Free', price: 0, priceCurrency: 'EUR' },
      hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'Online', courseWorkload: workload },
      hasPart: lessons.map((l) => ({ '@type': 'LearningResource', name: l.title, url: `${origin}/learn/${l.slug}` })),
    },
  ]);
</script>

<Seo
  title="Learn riichi mahjong: a free interactive course"
  description="Learn riichi mahjong step by step, from the tiles to scoring and strategy, with hands you play right in the page. Free, no account needed."
  path="/learn"
  type="website"
  {jsonld}
/>

<h1>Learn riichi mahjong</h1>
<p>
  A free course from your first tile to scoring, building a hand, and attack and defense. Every lesson has hands you play right in the page,
  with the same controls as a real game. No account needed.
</p>
<ProgressNudge />

{#each UNITS as unit, u (unit.id)}
  {@const list = lessons.filter((l) => l.unit === unit.id)}
  {#if list.length}
    <section class="unit" id={unit.id}>
      <h2>{u + 1}. {unit.title}</h2>
      <ol>
        {#each list as l (l.slug)}
          <li class:next={l.slug === next} class:done={done(l.slug)}>
            <a href="/learn/{l.slug}">
              <span class="title">{l.title}</span>
              <span class="summary">{l.summary} <span class="steps">· {Object.keys(exercisesOf(l.slug)).length} steps</span></span>
            </a>
            {#if done(l.slug)}<span class="mark" aria-label="Completed">✓</span>{:else if l.slug === next}<span
                class="chip gold">Continue</span
              >{/if}
          </li>
        {/each}
      </ol>
    </section>
  {/if}
{/each}

<section class="unit">
  <h2>Reference</h2>
  <ol>
    <li>
      <a href={REFERENCE.yaku.path}
        ><span class="title">{REFERENCE.yaku.title}</span><span class="summary">Every yaku with an example hand.</span></a
      >
    </li>
    <li>
      <a href={REFERENCE.glossary.path}
        ><span class="title">{REFERENCE.glossary.title}</span><span class="summary">Japanese terms in plain English.</span
        ></a
      >
    </li>
  </ol>
</section>

<Cta />

<style>
  .unit ol {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .unit li {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--panel);
    border-radius: var(--radius);
    padding: 10px 12px;
  }
  .unit li.next {
    outline: 2px solid var(--accent);
  }
  .unit a {
    flex: 1;
    display: flex;
    flex-direction: column;
    text-decoration: none;
    min-height: 44px;
    justify-content: center;
  }
  .title {
    font-weight: 600;
  }
  .summary {
    color: var(--ink-dim);
    font-size: 0.9rem;
    line-height: 1.35;
  }
  .steps {
    white-space: nowrap;
  }
  .mark {
    display: inline-grid;
    place-items: center;
    width: 1.6em;
    height: 1.6em;
    border-radius: 50%;
    background: var(--ok);
    color: #0d2a14;
    font-weight: 700;
  }
</style>
