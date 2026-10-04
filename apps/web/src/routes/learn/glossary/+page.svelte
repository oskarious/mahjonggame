<script lang="ts">
  import { page } from '$app/state';
  import Cta from '$lib/learn/components/Cta.svelte';
  import Seo from '$lib/learn/components/Seo.svelte';
  import { GLOSSARY } from '$lib/learn/glossary';
  import { LESSONS, REFERENCE } from '$lib/learn/registry';

  const ref = REFERENCE.glossary;
  const entries = [...GLOSSARY].sort((a, b) => a.term.localeCompare(b.term));
  const lessonTitle = (slug: string) => LESSONS.find((l) => l.slug === slug)?.title ?? slug;

  const origin = $derived(page.url.origin);
  const jsonld = $derived([
    {
      '@context': 'https://schema.org',
      '@type': 'DefinedTermSet',
      name: 'Riichi mahjong glossary',
      url: origin + ref.path,
      hasDefinedTerm: entries.map((g) => ({
        '@type': 'DefinedTerm',
        name: g.term,
        alternateName: g.gloss,
        description: g.definition,
        url: `${origin}${ref.path}#${g.id}`,
      })),
    },
  ]);
</script>

<Seo title={ref.seoTitle} description={ref.description} path={ref.path} {jsonld} />

<nav class="crumbs" aria-label="Breadcrumb"><a href="/learn">Learn</a> › Reference</nav>
<h1>{ref.title}</h1>
<p>Riichi mahjong uses many Japanese words. Here they are in plain English, with the lesson that teaches each one.</p>

<dl>
  {#each entries as g (g.id)}
    <div class="entry" id={g.id}>
      <dt>{g.term} <span class="gloss">{g.gloss}</span></dt>
      <dd>
        {g.definition}
        <a href="/learn/{g.lesson}">{lessonTitle(g.lesson)}</a>
      </dd>
    </div>
  {/each}
</dl>

<Cta />

<style>
  .crumbs {
    margin-top: 12px;
    font-size: 0.85rem;
    color: var(--ink-dim);
  }
  .crumbs a {
    color: var(--ink-dim);
  }
  dl {
    margin: 0;
  }
  .entry {
    padding: 10px 0;
    border-bottom: 1px solid var(--line);
    scroll-margin-top: 64px;
  }
  .entry:target {
    background: var(--panel);
    border-radius: var(--radius);
    padding: 10px;
  }
  dt {
    font-weight: 700;
  }
  .gloss {
    font-weight: 400;
    color: var(--ink-dim);
  }
  dd {
    margin: 2px 0 0;
  }
  dd a {
    font-size: 0.9rem;
    margin-left: 4px;
  }
</style>
