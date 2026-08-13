import { test, expect } from '@playwright/test';

const email = process.env.ADMIN_EMAIL ?? 'e2e-admin@vl6.test';
const password = process.env.ADMIN_PASSWORD ?? 'SenhaForte123!';

test.describe('Login', () => {
  test('entra com credenciais válidas e cai na Área do Irmão, independente do papel', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Senha').fill(password);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: 'Bem-vindo ao Portal do Irmão' })).toBeVisible();
  });

  test('mostra erro com senha inválida', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Senha').fill('senha-completamente-errada');
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page.getByText('E-mail ou senha inválidos.')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('respeita o redirect explícito mesmo com destino padrão diferente', async ({ page }) => {
    await page.goto('/login?redirect=/perfil');
    await page.getByLabel('E-mail').fill(email);
    await page.getByLabel('Senha').fill(password);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL(/\/perfil/);
  });
});
