import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

// A antiga rota /perfil (com abas radix "Meu Cadastro"/"Central VL6") foi
// substituída por /irmaos + /irmaos/meu-espaco, com sub-navegação simples
// via <TabNav> (links "Diretório"/"Meu Espaço", não role="tab") — ver
// apps/web/src/app/(member)/irmaos/layout.tsx e components/layout/tab-nav.tsx.
test.describe('Irmãos (Diretório + Meu Espaço)', () => {
  test('abas de /irmaos funcionam e o item aparece na navegação', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/irmaos');
    await expect(page.getByRole('heading', { name: 'Irmãos', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Meu Espaço' })).toBeVisible();

    await page.getByRole('link', { name: 'Meu Espaço' }).click();
    await expect(page).toHaveURL(/\/irmaos\/meu-espaco/);
    await expect(page.getByText('Algo deu errado')).toHaveCount(0);

    await expect(page.getByRole('link', { name: 'Irmãos' }).first()).toBeVisible();
  });

  test('/irmaos mostra o diretório (vazio ou com resultados) sem erro', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/irmaos');
    await expect(page.getByRole('heading', { name: 'Irmãos', exact: true })).toBeVisible();
    await expect(page.getByText('Algo deu errado')).toHaveCount(0);
  });

  test('/admin/pessoas/central mostra a moderação sem erro', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/admin/pessoas/central');
    await expect(page.getByRole('heading', { name: 'Central VL6' })).toBeVisible();
  });
});
