<script lang="ts">
  import { page } from '$app/state';
  import Cta from '$lib/learn/components/Cta.svelte';
  import ExampleHand from '$lib/learn/components/ExampleHand.svelte';
  import Seo from '$lib/components/Seo.svelte';
  import { REFERENCE } from '$lib/learn/registry';
  import { YAKU_LIST, yakuValue, type YakuEntry } from '$lib/learn/yaku';

  const ref = REFERENCE.yaku;

  const GROUPS: { title: string; test: (y: YakuEntry) => boolean }[] = [
    { title: '1 han', test: (y) => !y.yakuman && y.han === 1 },
    { title: '2 han', test: (y) => !y.yakuman && y.han === 2 },
    { title: '3 han and more', test: (y) => !y.yakuman && y.han >= 3 },
    { title: 'Yakuman', test: (y) => !!y.yakuman },
  ];

  const origin = $derived(page.url.origin);
  const jsonld = $derived([
    {
      '@context': 'https://schema.org',
      '@type': 'DefinedTermSet',
      name: 'Riichi mahjong yaku',
      url: origin + ref.path,
      hasDefinedTerm: YAKU_LIST.map((y) => ({
        '@type': 'DefinedTerm',
        name: y.name,
        alternateName: y.english,
        description: y.rule,
        url: `${origin}${ref.path}#${y.id}`,
      })),
    },
  ]);
</script>

<Seo title={ref.seoTitle} description={ref.description} path={ref.path} {jsonld} />

<nav class="crumbs" aria-label="Breadcrumb"><a href="/learn">Learn</a> › Reference</nav>
<h1>{ref.title}</h1>
<p>
  A hand needs at least one yaku to win. Here is every yaku played on Riichi Arena with its value and an example hand
  (the raised tile is the winning tile). New to yaku? Start with <a href="/learn/first-yaku">Your first yaku</a>.
</p>

{#each GROUPS as g (g.title)}
  <h2>{g.title}</h2>
  {#each YAKU_LIST.filter(g.test) as y (y.id)}
    <section class="yaku" id={y.id}>
      <h3>{y.name} <span class="en">{y.english}</span></h3>
      <p class="value">{yakuValue(y)}</p>
      <p>{y.rule}</p>
      <ExampleHand example={y.example} />
    </section>
  {/each}
{/each}

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
  .yaku {
    container-type: inline-size;
    background: var(--panel);
    border-radius: var(--radius);
    padding: 10px 12px;
    margin: 8px 0;
    scroll-margin-top: 64px;
  }
  .yaku h3 {
    margin: 0;
  }
  .en {
    font-weight: 400;
    color: var(--ink-dim);
    font-size: 0.95rem;
  }
  .value {
    margin: 2px 0;
    font-weight: 700;
    color: var(--accent);
    font-size: 0.9rem;
  }
</style>
