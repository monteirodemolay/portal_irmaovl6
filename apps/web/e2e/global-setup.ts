import { chromium, type FullConfig } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD } from './helpers';

/**
 * Roda uma vez, antes de qualquer teste, e força o Next (dev mode) a
 * compilar as rotas mais usadas — `/`, `/login`, `POST /api/v1/auth/login`,
 * `/dashboard`. Sem isso, o primeiro teste da suíte a chamar
 * `loginAsAdmin()` paga esse custo de compilação sob demanda e estoura o
 * timeout de asserção, um problema que só cresce conforme o app ganha mais
 * dependências/instrumentação (visto com Sentry, depois com @vercel/blob).
 * `webServer` (playwright.config.ts) já garante que o servidor está de pé
 * antes disto rodar; o tenant/admin de E2E já foi semeado por
 * `scripts/run-e2e.sh` antes do Playwright ser invocado.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use?.baseURL ?? 'http://localhost:3100';
  // globalSetup roda fora do runner de testes — o `executablePath` do
  // Chromium pré-instalado configurado em `projects` (abaixo) não se
  // aplica aqui automaticamente, precisa ser repetido.
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  });
  const page = await browser.newPage();

  await page.goto(`${baseURL}/`, { timeout: 90_000 });
  await page.goto(`${baseURL}/login`, { timeout: 90_000 });
  await page.getByLabel('E-mail').fill(ADMIN_EMAIL);
  await page.getByLabel('Senha').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 90_000 });

  await browser.close();
}
