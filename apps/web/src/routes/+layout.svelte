<script lang="ts">
  import '../app.css';
  import BgPattern from '$lib/components/BgPattern.svelte';
  import FullscreenButton from '$lib/components/FullscreenButton.svelte';

  let { children } = $props();
</script>

<BgPattern />
{@render children()}
<FullscreenButton />
