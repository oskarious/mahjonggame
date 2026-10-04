<script lang="ts">
  import { segments } from '$lib/learn/text';
  import Tiles from './Tiles.svelte';

  /** Text with `{1m}` tile tokens rendered as inline tiles. */
  let { text }: { text: string } = $props();
</script>

{#each segments(text) as s, i (i)}{#if 'text' in s}{s.text}{:else}<Tiles t={s.tiles} inline />{/if}{/each}
