import type { LayoutLoad } from './$types';

// A content page like Learn: own metadata (Seo.svelte), no fullscreen toggle.
export const load: LayoutLoad = () => ({ contentPage: true });
