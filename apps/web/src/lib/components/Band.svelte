<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  /**
   * A full-bleed band: a section of a narrow page that is wider than the page column, edge to edge on phones and
   * centred up to `--band-max` on wider screens, for content that needs the width (a hand of tiles). Its heading is a
   * label in line with the page column; content runs nearly edge to edge, and text rows inside indent by
   * `--band-inset` to line up with the column too.
   */
  let {
    title,
    aside,
    children,
    ...rest
  }: HTMLAttributes<HTMLElement> & {
    title: string;
    /** Right of the heading (a countdown, a count). */
    aside?: Snippet;
    children: Snippet;
  } = $props();

  const id = $props.id();
</script>

<section class="band" aria-labelledby="{id}-title" {...rest}>
  <header>
    <h2 id="{id}-title">{title}</h2>
    {#if aside}<span class="aside">{@render aside()}</span>{/if}
  </header>
  {@render children()}
</section>

<style>
  .band {
    --band-max: 560px;
    /* The column gutter (18px) less the band's own side padding: text rows inside use it to line up. */
    --band-inset: 14px;
    --w: min(100vw, var(--band-max));
    /* Tile rows inside measure the band (see --col in app.css). */
    container-type: inline-size;
    box-sizing: border-box;
    width: var(--w);
    margin: 18px calc(50% - var(--w) / 2) 0;
    padding: 14px 4px 12px;
    border-radius: var(--radius);
    background: var(--surface-me);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  /* Touching the screen edges: square corners. */
  @media (max-width: 560px) {
    .band {
      border-radius: 0;
    }
  }
  header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    padding: 0 var(--band-inset);
  }
  h2,
  .aside {
    margin: 0;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--ink-dim);
  }
  h2 {
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .aside {
    font-variant-numeric: tabular-nums;
  }
</style>
