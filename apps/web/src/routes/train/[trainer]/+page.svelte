<script lang="ts">
  import Trainer from '$lib/train/components/Trainer.svelte';

  let { data } = $props();
</script>

<!-- A new component per trainer, so no problem or run carries over. -->
{#key data.id}
  <Trainer {...data} />
{/key}
