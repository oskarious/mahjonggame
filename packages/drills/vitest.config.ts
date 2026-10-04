import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The seed sweeps play many bot games; leave room on a busy machine.
    testTimeout: 60_000,
  },
});
