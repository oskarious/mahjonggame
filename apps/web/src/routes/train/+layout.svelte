<script lang="ts">
  import ContentShell from '$lib/components/ContentShell.svelte';

  let { children } = $props();
</script>

<ContentShell>{@render children()}</ContentShell>
