<script lang="ts">
  import LessonBody from '$lib/learn/components/LessonBody.svelte';

  let { data } = $props();
</script>

<!-- A new component per lesson, so the lesson context (exercises, linked terms) never carries over. -->
{#key data.meta.slug}
  <LessonBody {...data} />
{/key}
