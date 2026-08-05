import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/helpers/setup.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    include: ['tests/api/**/*.test.ts'],
    exclude: ['node_modules', 'src'],
  },
});
