import { defineConfig } from 'vitest/config';

/**
 * Testes unitários de módulos puros de `src/lib/**` (sem DOM/Next.js
 * runtime) — separado dos testes E2E (Playwright, `testDir: './e2e'`,
 * config em playwright.config.ts), que cobrem os fluxos completos contra
 * o app rodando de verdade.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
