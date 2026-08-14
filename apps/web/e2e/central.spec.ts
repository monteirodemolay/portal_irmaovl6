import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test.describe('Central dos Irmãos VL6', () => {
  test('abas de /perfil funcionam e a Central aparece na navegação', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/perfil');
    await expect(page.getByRole('tab', { name: 'Meu Cadastro' })).toBeVisible();
    await page.getByRole('tab', { name: 'Central VL6' }).click();
    await expect(page.getByRole('tabpanel')).toBeVisible();

    await expect(page.getByRole('link', { name: 'Central VL6' })).toBeVisible();
  });

  test('/central mostra o diretório (vazio ou com resultados) sem erro', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/central');
    await expect(page.getByRole('heading', { name: 'Central VL6' })).toBeVisible();
  });

  test('/admin/pessoas/central mostra a moderação sem erro', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/admin/pessoas/central');
    await expect(page.getByRole('heading', { name: 'Central VL6' })).toBeVisible();
  });
});
