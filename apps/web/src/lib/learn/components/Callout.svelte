<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    /** ema: where EMA tournament rules or other apps differ; tip; mistake: a common beginner trap. */
    kind: 'ema' | 'tip' | 'mistake';
    title?: string;
    children: Snippet;
  }
  let { kind, title, children }: Props = $props();
  const TITLES = { ema: 'Rules note', tip: 'Tip', mistake: 'Common mistake' };
</script>

<aside class="callout {kind}">
  <strong>{title ?? TITLES[kind]}</strong>
  <div>{@render children()}</div>
</aside>

<style>
  .callout {
    background: var(--panel);
    border-radius: var(--radius);
    padding: 12px 14px;
    margin: 8px 0;
  }
  strong {
    display: inline-block;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 2px 8px;
    border-radius: 999px;
    margin-bottom: 6px;
    background: var(--panel-2);
  }
  .mistake strong {
    background: var(--danger);
    color: #1f0c05;
  }
  .tip strong {
    background: var(--ok);
    color: #0d2a14;
  }
  div :global(p) {
    margin: 0.4em 0 0;
  }
  div :global(p:first-child) {
    margin-top: 0;
  }
</style>
