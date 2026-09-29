<script lang="ts" module>
  export const SITE_NAME = "riichi arena";
</script>

<script lang="ts">
  /** The page's own part of the document title; the site name is appended (or stands alone without it). */
  let { page }: { page?: string } = $props();
</script>

<svelte:head>
  <title>{page ? `${page} · ${SITE_NAME}` : SITE_NAME}</title>
</svelte:head>
