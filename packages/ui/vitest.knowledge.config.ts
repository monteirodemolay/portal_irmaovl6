import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@vl6/shared': new URL('../shared/src/index.ts', import.meta.url).pathname,
      next: new URL('../../apps/web/node_modules/next', import.meta.url).pathname,
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['tests/knowledge*.test.ts', 'tests/knowledge*.test.tsx'],
  },
});
