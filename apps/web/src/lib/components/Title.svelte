<script lang="ts" module>
  export const SITE_NAME = "riichi arena";
</script>

<script lang="ts">
  /**
   * The page's own part of the document title; the site name is appended (or stands alone without it).
   * `description` becomes the meta description (for pages search engines should show well).
   */
  let { page, description }: { page?: string; description?: string } = $props();
</script>

<svelte:head>
  <title>{page ? `${page} · ${SITE_NAME}` : SITE_NAME}</title>
  {#if description}<meta name="description" content={description} />{/if}
</svelte:head>
