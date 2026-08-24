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
  // Aquece /, /login e /dashboard antes da suíte real começar — ver
  // e2e/global-setup.ts. Reduz a variância do primeiro teste que loga,
  // mas cada rota nova ainda compila sob demanda no seu primeiro acesso
  // (ex.: /admin/pessoas/irmaos/novo), então os timeouts abaixo continuam
  // generosos de propósito — dev mode do Next, não representativo do
  // tempo de resposta em produção (já compilada).
  timeout: 90_000,
  // 20s não é generoso o bastante sob carga (visto na prática: rotas frias
  // estourando o timeout padrão em pontos diferentes do fluxo em execuções
  // sucessivas) — 40s absorve o compile on-demand sem mascarar timeouts
  // reais de asserção.
  expect: { timeout: 40_000 },
  globalSetup: './e2e/global-setup.ts',
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
