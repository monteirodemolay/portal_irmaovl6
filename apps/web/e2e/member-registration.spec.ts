import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test('admin cadastra um novo Irmão e o vê na listagem', async ({ page }) => {
  await loginAsAdmin(page);

  const nome = `Irmão E2E ${Date.now()}`;
  const matricula = `E2E-${Date.now()}`;

  await page.goto('/admin/irmaos/novo');
  await page.getByLabel('Nome completo').fill(nome);
  await page.getByLabel('E-mail', { exact: true }).fill(`${matricula.toLowerCase()}@vl6.test`);
  await page.getByLabel('Matrícula').fill(matricula);
  await page.getByLabel('Grau').selectOption('mestre');
  await page.getByRole('button', { name: 'Salvar' }).click();

  await expect(page).toHaveURL(/\/admin\/irmaos\/[^/]+$/);
  await expect(page.getByRole('heading', { name: nome })).toBeVisible();

  await page.goto('/admin/irmaos');
  await expect(page.getByText(nome)).toBeVisible();
});
