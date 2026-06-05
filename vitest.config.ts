import { defineConfig } from 'vitest/config';

// Pure game-logic tests run in a plain Node environment — no DOM,
// no Yorkie server, no browser — so they're fast and CI-friendly.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
