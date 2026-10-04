<script lang="ts">
  import type { Snippet } from 'svelte';
  import { GLOSSARY } from '$lib/learn/glossary';
  import Tip from './Tip.svelte';

  /** A glossary term: its definition in a tooltip on first use in a part, linking to the full glossary. */
  let { id, children }: { id: string; children: Snippet } = $props();

  const entry = $derived(GLOSSARY.find((g) => g.id === id));
</script>

{#if entry}
  <Tip id="term-{id}" href="/learn/glossary#{id}" more="Full glossary →" {children}>
    {#snippet tip()}<span><strong>{entry.term}</strong> <span class="dim">{entry.gloss}</span></span><span
        >{entry.definition}</span
      >{/snippet}
  </Tip>
{:else}
  {@render children()}
{/if}
