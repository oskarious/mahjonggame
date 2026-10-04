<script lang="ts">
  import { getContext, onMount, untrack } from 'svelte';
  import { LESSON, type LessonContext } from '$lib/learn/context';
  import { markSolved, solved as wasSolved } from '$lib/learn/progress.svelte';
  import ExerciseCard from './ExerciseCard.svelte';

  let { id }: { id: string } = $props();

  const lesson = getContext<LessonContext>(LESSON);
  // An exercise is placed for one id (lessons never change it), so it is read once.
  const exId = untrack(() => id);
  const ex = lesson.exercises[exId];
  if (!ex) throw new Error(`Exercise ${exId} not found in ${lesson.slug}`);

  let doneBefore = $state(false);
  onMount(() => (doneBefore = wasSolved(lesson.slug, exId)));
</script>

<ExerciseCard
  id={exId}
  exercise={ex}
  {doneBefore}
  onresult={(r) => {
    if (r.correct) markSolved(lesson.slug, exId);
  }}
/>
