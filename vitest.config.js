import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tools/**/*.test.js', 'src/**/*.test.js'],
  },
});
