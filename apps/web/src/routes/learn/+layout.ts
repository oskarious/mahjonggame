import type { LayoutLoad } from './$types';

// A content page: it sets its own title, description, canonical and link-preview tags (Seo.svelte), and has no
// fullscreen toggle (that is for play).
export const load: LayoutLoad = () => ({ contentPage: true });
