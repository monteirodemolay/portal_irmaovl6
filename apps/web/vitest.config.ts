import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Testes unitários de módulos puros de `src/lib/**` (sem DOM/Next.js
 * runtime) — separado dos testes E2E (Playwright, `testDir: './e2e'`,
 * config em playwright.config.ts), que cobrem os fluxos completos contra
 * o app rodando de verdade.
 */
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
