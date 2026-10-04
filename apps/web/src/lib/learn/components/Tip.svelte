<script lang="ts" module>
  /** One tooltip open at a time across the page. */
  const shared = $state({ open: null as symbol | null });
</script>

<script lang="ts">
  import { getContext, untrack, type Snippet } from 'svelte';
  import { PART_TERMS } from '$lib/learn/context';

  /**
   * A word with a tooltip (Term and Yaku build on it). On its first use in a lesson part it shows the tooltip (hover
   * with a mouse, tap on touch) ending in a link to the reference page; later uses are plain text. In the HTML it is a
   * real link to the reference entry, so it works without scripts and counts as an internal link.
   */
  let {
    id,
    href,
    more,
    children,
    tip: content,
  }: {
    /** Unique per kind of reference ("term:river"), so a word gets one tooltip per part. */
    id: string;
    href: string;
    /** Label of the link at the end of the tooltip. */
    more: string;
    children: Snippet;
    tip: Snippet;
  } = $props();

  const linked = getContext<Set<string> | undefined>(PART_TERMS);
  // Decided once, in render order, so the server and the client agree.
  const active = untrack(() => {
    if (!linked || linked.has(id)) return false;
    linked.add(id);
    return true;
  });

  const me = Symbol();
  const open = $derived(shared.open === me);
  let wrap: HTMLSpanElement | undefined = $state();
  let tip: HTMLSpanElement | undefined = $state();
  /** Horizontal shift that keeps the tooltip on screen. */
  let shift = $state(0);
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  let lastPointer = '';

  function show() {
    clearTimeout(closeTimer);
    shared.open = me;
  }
  function hide() {
    if (shared.open === me) shared.open = null;
  }
  function hideSoon() {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(hide, 150);
  }

  // Measure after opening and slide the tooltip back inside the viewport.
  $effect(() => {
    if (!open || !tip || !wrap) return;
    // Measured from the term (not the tooltip, which may already be shifted).
    const left = wrap.getBoundingClientRect().left;
    const width = tip.offsetWidth;
    const margin = 8;
    const room = document.documentElement.clientWidth - margin;
    let dx = 0;
    if (left + width > room) dx = room - (left + width);
    if (left + dx < margin) dx = margin - left;
    shift = dx;
  });

  // Close on a tap elsewhere or Escape.
  $effect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (wrap && !wrap.contains(e.target as Node)) hide();
    };
    const key = (e: KeyboardEvent) => e.key === 'Escape' && hide();
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', key);
    };
  });

  function click(e: MouseEvent) {
    // The word itself opens the tooltip; the link inside it goes to the reference page.
    e.preventDefault();
    if (lastPointer === 'mouse') show();
    else if (open) hide();
    else show();
  }
</script>

{#if active}
  <span class="wrap" bind:this={wrap} role="presentation" onpointerleave={(e) => e.pointerType === 'mouse' && hideSoon()}>
    <a
      class="term"
      {href}
      aria-expanded={open}
      aria-describedby={open ? `tip-${id}` : undefined}
      onpointerdown={(e) => (lastPointer = e.pointerType)}
      onpointerenter={(e) => e.pointerType === 'mouse' && show()}
      onclick={click}>{@render children()}</a
    >{#if open}<span
        class="tip"
        id="tip-{id}"
        role="tooltip"
        bind:this={tip}
        style:--shift="{shift}px"
        onpointerenter={() => clearTimeout(closeTimer)}
        >{@render content()}<a class="more" {href}>{more}</a></span
      >{/if}
  </span>
{:else}
  <em class="term">{@render children()}</em>
{/if}

<style>
  .term {
    font-style: normal;
    font-weight: 600;
  }
  .wrap {
    position: relative;
  }
  a.term {
    color: inherit;
    text-decoration: underline dotted;
    text-decoration-color: var(--accent);
    text-decoration-thickness: 2px;
    text-underline-offset: 3px;
    cursor: help;
  }
  .tip {
    position: absolute;
    z-index: 20;
    left: 0;
    top: calc(100% + 6px);
    transform: translateX(var(--shift, 0));
    width: max-content;
    max-width: min(280px, calc(100vw - 16px));
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 12px;
    border-radius: var(--radius);
    background: var(--panel-2);
    color: var(--ink);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
    font-size: 0.9rem;
    font-weight: 400;
    line-height: 1.4;
    text-align: left;
    white-space: normal;
  }
  .tip :global(strong) {
    font-weight: 700;
  }
  .tip :global(.dim) {
    color: var(--ink-dim);
  }
  .more {
    margin-top: 2px;
    color: var(--accent);
    font-weight: 600;
    text-decoration: none;
    min-height: 32px;
    display: inline-flex;
    align-items: center;
  }
</style>
