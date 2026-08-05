import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test('admin cria e publica uma Notícia, que aparece no site público', async ({ page }) => {
  await loginAsAdmin(page);

  const titulo = `Notícia E2E ${Date.now()}`;

  await page.goto('/admin/noticias/nova');
  await page.getByLabel('Título', { exact: true }).fill(titulo);
  await page.getByLabel('Categoria').fill('Institucional');
  await page.getByLabel('Conteúdo').fill('<p>Conteúdo de teste gerado pelo E2E.</p>');
  await page.getByRole('button', { name: 'Salvar' }).click();

  await expect(page).toHaveURL(/\/admin\/noticias\/[^/]+$/);
  await page.getByRole('button', { name: 'Publicar' }).click();
  await expect(page.getByRole('button', { name: 'Despublicar' })).toBeVisible();

  await page.goto('/noticias');
  await expect(page.getByText(titulo)).toBeVisible();

  await page.getByText(titulo).click();
  await expect(page.getByRole('heading', { name: titulo })).toBeVisible();
});
