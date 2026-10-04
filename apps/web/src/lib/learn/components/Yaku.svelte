<script lang="ts">
  import type { Snippet } from 'svelte';
  import { yakuTip, type YakuTipId } from '$lib/learn/yaku';
  import Tip from './Tip.svelte';

  /** A yaku: its value and rule in a tooltip on first use in a part, linking to the yaku list. */
  let { id, children }: { id: YakuTipId; children: Snippet } = $props();

  const y = $derived(yakuTip(id));
</script>

<Tip id="yaku-{id}" href="/learn/yaku#{y.anchor}" more="All yaku →" {children}>
  {#snippet tip()}<span><strong>{y.name}</strong> <span class="dim">{y.english}</span></span><span class="dim"
      >{y.value}</span
    ><span>{y.rule}</span>{/snippet}
</Tip>
