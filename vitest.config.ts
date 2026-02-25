import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    include: [
      'scripts/**/*.test.ts',
      'lib/**/*.test.ts',
      'app/**/*.test.ts',
      'app/**/*.test.tsx',
      'components/**/*.test.tsx',
    ],
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
