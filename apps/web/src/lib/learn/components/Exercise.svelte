<script lang="ts">
  import { getContext, tick, untrack } from 'svelte';
  import { LESSON, type LessonContext } from '$lib/learn/context';
  import { markSolved, solvedVariants } from '$lib/learn/progress.svelte';
  import ExerciseCard from './ExerciseCard.svelte';

  /** One exercise placement in a lesson: its set's variants, played one after another in the same card. */
  let { id }: { id: string } = $props();

  const lesson = getContext<LessonContext>(LESSON);
  // An exercise is placed for one id (lessons never change it), so it is read once.
  const exId = untrack(() => id);
  const set = lesson.exercises[exId];
  if (!set?.length) throw new Error(`Exercise ${exId} not found in ${lesson.slug}`);

  /** The variant shown; the first on the server, so the HTML holds one complete exercise. */
  let index = $state(0);
  /** Variants answered right, on earlier visits or now (empty until the reader's progress is loaded, after mounting). */
  const solved = $derived(solvedVariants(lesson.slug, exId));

  let box: HTMLElement | undefined = $state();
  async function next() {
    index++;
    await tick();
    // The next prompt must be read first: bring the card's top back under the sticky header if it scrolled away.
    const head = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
    const top = box?.getBoundingClientRect().top ?? 0;
    if (top < head) window.scrollBy({ top: top - head - 8 });
  }
</script>

<div class="set" bind:this={box}>
  {#key index}
    <ExerciseCard
      id={set.length > 1 ? `${exId}-${index + 1}` : exId}
      exercise={set[index]}
      doneBefore={solved.includes(index)}
      onresult={(r) => {
        if (r.correct) markSolved(lesson.slug, exId, index);
      }}
    >
      {#snippet aside()}
        {#if set.length > 1}
          <span class="count" aria-label="{index + 1} of {set.length}">{index + 1}/{set.length}</span>
        {/if}
      {/snippet}
      {#snippet after()}
        {#if index < set.length - 1}
          <button class="btn primary big next" onclick={next}>Next</button>
        {/if}
      {/snippet}
    </ExerciseCard>
  {/key}
</div>

<style>
  .count {
    color: var(--ink-dim);
    font-size: 0.85rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    padding-top: 0.15em;
  }
  .next {
    min-height: 56px;
  }
</style>
