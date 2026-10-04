<script lang="ts">
  import { getContext, setContext, untrack, type Snippet } from 'svelte';
  import { LESSON, PART_TERMS, type LessonContext } from '$lib/learn/context';

  /**
   * One part of a lesson: a heading, the text that supports it, and one exercise set (the lesson test enforces that).
   * The lesson shows one part at a time; all parts are in the server-rendered HTML.
   */
  let { title, children }: { title: string; children: Snippet } = $props();

  const lesson = getContext<LessonContext>(LESSON);
  // Registered once, in render order, so the server and the client number the parts alike.
  const index = untrack(() => lesson.parts.titles.push(title) - 1);
  const hidden = $derived(index !== lesson.parts.view.current);
  // Readers may start at any part, so each part explains its own terms.
  setContext(PART_TERMS, new Set<string>());
</script>

<section class="part" class:later={hidden} id="part-{index + 1}" aria-labelledby="part-{index + 1}-title">
  <h2 id="part-{index + 1}-title">{title}</h2>
  {@render children()}
</section>

<style>
  /* Without scripts every part shows, as one article (LessonBody adds a <noscript> override). */
  .part.later {
    display: none;
  }
</style>
