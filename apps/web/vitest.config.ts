import { defineConfig } from 'vitest/config';

// Unit tests for plain TS modules (no SvelteKit plugin: tests must not import $lib/$app).
export default defineConfig({
  test: { include: ['src/**/*.test.ts'] },
});
