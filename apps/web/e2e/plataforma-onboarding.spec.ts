import { test, expect } from '@playwright/test';
import { PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_PASSWORD } from './helpers';

test.describe('Onboarding de nova Loja (Administrador Geral)', () => {
  // Não verifica login do admin novo fim a fim: este ambiente de E2E só
  // resolve tenant por host para o subdomínio "localhost" (seed do tenant
  // VL6) — a Loja criada aqui tem subdomínio próprio, que nunca vai
  // resolver nesse único host disponível (isolamento entre tenants
  // funcionando como esperado, não uma limitação a contornar). A
  // corretude de `bootstrapTenantAdmin` + sync de claims já é coberta nos
  // testes unitários de domínio.
  test('cria uma Loja de ponta a ponta e mostra as credenciais do admin', async ({ page }) => {
    await page.goto('/login?redirect=/plataforma');
    await page.getByLabel('E-mail').fill(PLATFORM_ADMIN_EMAIL);
    await page.getByLabel('Senha').fill(PLATFORM_ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/plataforma/);

    await page.getByRole('link', { name: 'Nova Loja', exact: true }).click();
    await expect(page).toHaveURL(/\/plataforma\/lojas\/nova/);

    const subdominio = `e2e-${Date.now()}`;
    const adminEmail = `admin-${Date.now()}@e2e-loja.test`;

    await page.getByLabel('Nome').fill('Loja E2E de Teste');
    await page.getByLabel('Número').fill('99');
    await page.getByLabel('Subdomínio').fill(subdominio);
    await page.getByLabel('E-mail de contato da Loja').fill('contato@e2e-loja.test');
    await page.getByLabel('E-mail do Administrador').fill(adminEmail);
    await page.getByRole('button', { name: 'Criar Loja' }).click();

    await expect(page.getByText('Loja E2E de Teste')).toBeVisible();
    await expect(page.getByText(adminEmail)).toBeVisible();
    await expect(page.getByTestId('temporary-password')).toBeVisible();
    await expect(page.getByTestId('temporary-password')).not.toHaveText('');
  });

  test('bloqueia quem não é Administrador Geral', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail').fill(process.env.ADMIN_EMAIL ?? 'e2e-admin@vl6.test');
    await page.getByLabel('Senha').fill(process.env.ADMIN_PASSWORD ?? 'SenhaForte123!');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    const response = await page.goto('/plataforma');
    expect(response?.status()).toBe(404);
  });
});
