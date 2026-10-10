import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
    // Open pages notice a deploy and load it in full on their next navigation.
    version: { pollInterval: 300_000 },
    typescript: {
      // Also typecheck DB migrations and Node scripts.
      config: (c) => ({ ...c, include: [...c.include, '../migrations/**/*.ts', '../scripts/**/*.ts'] }),
    },
  },
};
