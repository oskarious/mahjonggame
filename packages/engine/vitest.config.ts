import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Simulation tests play many full games; leave room on a busy machine.
    testTimeout: 60_000,
  },
});
