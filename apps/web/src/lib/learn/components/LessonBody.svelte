<script lang="ts">
  import { onMount, setContext, untrack, type Component } from 'svelte';
  import { page } from '$app/state';
  import { LESSON, type ExerciseSet, type LessonContext } from '$lib/learn/context';
  import { markRead } from '$lib/learn/progress.svelte';
  import { trackOwner } from '$lib/progress/client.svelte';
  import ProgressNudge from '$lib/progress/ProgressNudge.svelte';
  import type { LessonMeta, Unit } from '$lib/learn/registry';
  import { trainerForLesson } from '$lib/train/registry';
  import Cta from './Cta.svelte';
  import Seo from './Seo.svelte';

  interface Props {
    meta: LessonMeta;
    unit: Unit;
    article: Component;
    exercises: Record<string, ExerciseSet>;
    prev?: LessonMeta;
    next?: LessonMeta;
    related: LessonMeta[];
    position: number;
    /** The part to show, 1-based (from `?step=`). */
    step: number;
  }
  let { meta, unit, article: Article, exercises, prev, next, related, position, step }: Props = $props();

  /** One exercise set per part (the lesson test enforces it), so the part count is known before the parts render. */
  const total = $derived(Math.max(1, Object.keys(exercises).length));
  const clamp = (n: number, t: number) => Math.min(Math.max(1, Math.floor(n) || 1), t) - 1;

  const view = $state({ current: untrack(() => clamp(step, Math.max(1, Object.keys(exercises).length))) });
  $effect.pre(() => {
    view.current = clamp(step, total);
  });
  const current = $derived(view.current);
  const last = $derived(current === total - 1);

  // The page re-creates this component per lesson ({#key}), so the context is set once.
  const parts = { titles: [] as string[], view };
  setContext<LessonContext>(
    LESSON,
    untrack(() => ({ slug: meta.slug, exercises, parts })),
  );

  const path = $derived(`/learn/${meta.slug}`);
  const trainer = $derived(trainerForLesson(meta.slug));
  const origin = $derived(page.url.origin);
  const jsonld = $derived([
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: meta.seoTitle,
      description: meta.description,
      url: origin + path,
      dateModified: meta.updated,
      inLanguage: 'en',
      learningResourceType: 'Lesson',
      isPartOf: { '@type': 'Course', name: 'Learn riichi mahjong', url: `${origin}/learn` },
      publisher: { '@type': 'Organization', name: 'Riichi Arena', url: origin },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Learn', item: `${origin}/learn` },
        { '@type': 'ListItem', position: 2, name: meta.title, item: origin + path },
      ],
    },
  ]);
  // Without scripts, every part and the end of the lesson show as one article. Assembled so this file never contains
  // a literal style tag (the Svelte preprocessor would take it for the component's own).
  const LT = String.fromCharCode(60);
  const noscript = `${LT}noscript>${LT}style>.part.later,.end.later{display:block!important}${LT}/style>${LT}/noscript>`;

  trackOwner();

  // Reaching the call to action at the end counts as having read the lesson.
  let end: HTMLElement | undefined = $state();
  onMount(() => {
    if (!end) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        markRead(meta.slug);
        io.disconnect();
      }
    });
    io.observe(end);
    return () => io.disconnect();
  });
</script>

<Seo title={meta.seoTitle} description={meta.description} {path} {jsonld} />
<svelte:head>{@html noscript}</svelte:head>

<article>
  <nav class="crumbs" aria-label="Breadcrumb">
    <a href="/learn">Learn</a> › <a href="/learn#{unit.id}">{unit.title}</a> <span class="n">· Lesson {position}</span>
  </nav>
  <h1>{meta.title}</h1>
  <div class="steps" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={current + 1}>
    <span class="label">Step {current + 1} of {total}</span>
    <span class="bar">
      {#each { length: total } as _, i (i)}<a class="seg" class:on={i <= current} href="?step={i + 1}" aria-label="Step {i + 1}"></a>{/each}
    </span>
  </div>

  <Article />

  {#if !last}
    <nav class="step-nav" aria-label="Steps">
      {#if current > 0}<a class="btn" href="?step={current}">Back</a>{:else}<span></span>{/if}
      <a class="btn primary" href="?step={current + 2}">Next: {parts.titles[current + 1] ?? 'continue'}</a>
    </nav>
    <Cta variant="inline" />
  {/if}

  <div class="end" class:later={!last} bind:this={end}>
    {#if trainer}
      <a class="btn big practice" href="/train/{trainer.id}">Practice: {trainer.title} trainer</a>
    {/if}
    <ProgressNudge />
    <Cta />

    <nav class="pager" aria-label="Lessons">
      {#if total > 1}<a class="btn" href="?step={total - 1}">Back</a>{:else if prev}<a class="btn" href="/learn/{prev.slug}"
          rel="prev">← {prev.title}</a
        >{:else}<span></span>{/if}
      {#if next}<a class="btn primary" href="/learn/{next.slug}" rel="next">Next lesson: {next.title}</a>{/if}
    </nav>

    {#if related.length}
      <section class="related">
        <h2>Related</h2>
        <ul>
          {#each related as r (r.slug)}
            <li><a href="/learn/{r.slug}">{r.title}</a> <span>{r.summary}</span></li>
          {/each}
        </ul>
      </section>
    {/if}
  </div>
</article>

<style>
  .crumbs {
    margin-top: 12px;
    font-size: 0.85rem;
    color: var(--ink-dim);
  }
  .crumbs a {
    color: var(--ink-dim);
  }
  .steps {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 4px;
  }
  .steps .label {
    font-size: 0.8rem;
    color: var(--ink-dim);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .bar {
    display: flex;
    gap: 4px;
  }
  .seg {
    flex: 1;
    height: 6px;
    border-radius: 3px;
    background: var(--panel-2);
  }
  .seg.on {
    background: var(--accent);
  }
  .practice {
    display: flex;
    margin-top: 24px;
    min-height: 52px;
    text-decoration: none;
  }
  .step-nav,
  .pager {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin-top: 16px;
  }
  .step-nav .btn,
  .pager .btn {
    text-decoration: none;
    min-height: 48px;
    font-size: 0.95rem;
  }
  .step-nav .primary {
    flex: 1;
  }
  .end.later {
    display: none;
  }
  .related ul {
    list-style: none;
    padding: 0;
  }
  .related li {
    margin: 8px 0;
  }
  .related span {
    display: block;
    color: var(--ink-dim);
    font-size: 0.9rem;
  }
</style>
