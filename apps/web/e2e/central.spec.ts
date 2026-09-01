import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

// A Comunidade VL6 unifica Diretório + Negócios & Serviços + Meu Espaço numa
// única página (`/irmaos`) — ver apps/web/src/app/(member)/irmaos/page.tsx.
// "Meu Espaço" deixou de ser aba de navegação principal (`TabNav` removido
// de layout.tsx), mas continua acessível como editor em /irmaos/meu-espaco.
test.describe('Comunidade VL6 (Diretório + Negócios + Meu Espaço unificados)', () => {
  test('/irmaos mostra a Comunidade VL6 com o controle segmentado, sem erro', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/irmaos');
    await expect(page.getByRole('heading', { name: 'Comunidade VL6', exact: true })).toBeVisible();
    await expect(page.getByText('Algo deu errado')).toHaveCount(0);
    const segmentedControl = page.getByRole('navigation', { name: 'Tipo de resultado' });
    await expect(segmentedControl.getByRole('link', { name: 'Tudo' })).toBeVisible();
    await expect(segmentedControl.getByRole('link', { name: 'Irmãos' })).toBeVisible();
    await expect(segmentedControl.getByRole('link', { name: 'Negócios e Serviços' })).toBeVisible();
  });

  test('tipo=negocios via URL pré-seleciona os resultados de negócios', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/irmaos?tipo=negocios');
    await expect(page.getByText('Algo deu errado')).toHaveCount(0);
    const segmentedControl = page.getByRole('navigation', { name: 'Tipo de resultado' });
    await expect(
      segmentedControl.getByRole('link', { name: 'Negócios e Serviços' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  test('/irmaos/negocios redireciona pra Comunidade VL6 com tipo=negocios', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/irmaos/negocios');
    await expect(page).toHaveURL(/\/irmaos\?tipo=negocios/);
    await expect(page.getByText('Algo deu errado')).toHaveCount(0);
  });

  test('/irmaos/meu-espaco continua funcionando (editor do próprio perfil)', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/irmaos/meu-espaco');
    await expect(page.getByText('Algo deu errado')).toHaveCount(0);
    await expect(page).toHaveURL(/\/irmaos\/meu-espaco/);
  });

  test('empresa inexistente em /irmaos/negocios/[businessId] devolve 404', async ({ page }) => {
    await loginAsAdmin(page);

    const response = await page.goto('/irmaos/negocios/empresa-que-nao-existe');
    expect(response?.status()).toBe(404);
  });

  test('/admin/pessoas/central mostra a moderação sem erro', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/admin/pessoas/central');
    await expect(page.getByRole('heading', { name: 'Central VL6' })).toBeVisible();
  });
});
