<script lang="ts">
  import Tiles from './Tiles.svelte';

  /** Inline tiles in running text: <T t="5p" />. */
  let { t }: { t: string } = $props();
</script>

<Tiles {t} inline />
