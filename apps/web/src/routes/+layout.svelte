<script lang="ts">
  import '../app.css';
  import BgPattern from '$lib/components/BgPattern.svelte';

  let { children } = $props();
</script>

<BgPattern />
{@render children()}
