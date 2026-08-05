import { defineConfig, devices } from '@playwright/test';

/**
 * Testes E2E dos fluxos críticos — docs/architecture/10-roadmap.md, v1.3.
 * Rodam contra o Firebase Emulator Suite (Auth + Firestore), nunca contra
 * um projeto real — ver `scripts/run-e2e.sh` para a orquestração completa
 * (emulators:exec → seed do tenant/admin → playwright).
 *
 * `executablePath` aponta pro Chromium já instalado no ambiente em vez de
 * deixar o Playwright baixar um novo binário.
 */
export default defineConfig({
  testDir: './e2e',
  // Next em dev mode compila cada rota sob demanda no primeiro acesso — o
  // teste que primeiro passa por uma rota ainda não compilada paga esse
  // custo (múltiplos segundos por rota), então o timeout padrão de 30s do
  // Playwright é apertado demais para o primeiro teste da suíte.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' },
      },
    },
  ],
  webServer: {
    command: 'pnpm exec next dev --port 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_USE_FIREBASE_EMULATOR: 'true',
      NEXT_PUBLIC_FIREBASE_API_KEY: 'demo-api-key',
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'localhost',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'demo-vl6',
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'demo-vl6.appspot.com',
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '000000000000',
      NEXT_PUBLIC_FIREBASE_APP_ID: '1:000000000000:web:0000000000000000000000',
    },
  },
});
