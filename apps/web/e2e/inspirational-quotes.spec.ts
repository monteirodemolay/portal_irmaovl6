import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test('admin cria uma Frase, ela aparece no Início e pode ser desativada', async ({ page }) => {
  await loginAsAdmin(page);

  const texto = `Frase E2E ${Date.now()}`;
  const autor = 'Irmão de Teste';

  await page.goto('/admin/conteudo/frases/nova');
  await page.getByLabel('Frase').fill(texto);
  await page.getByLabel('Autor').fill(autor);
  await page.getByRole('button', { name: 'Salvar' }).click();

  await expect(page).toHaveURL(/\/admin\/conteudo\/frases$/, { timeout: 40_000 });
  await expect(page.getByText(texto)).toBeVisible();
  await expect(page.getByText('ativa', { exact: true })).toBeVisible();

  // Única frase cadastrada no tenant: qualquer modo de rotação aponta pra ela.
  await page.goto('/dashboard');
  await expect(page.getByText(texto, { exact: false })).toBeVisible();
  await expect(page.getByText(autor, { exact: false })).toBeVisible();

  await page.goto('/admin/conteudo/frases');
  await page.getByRole('button', { name: 'Desativar' }).click();
  await expect(page.getByRole('button', { name: 'Ativar' })).toBeVisible();
  await expect(page.getByText('inativa', { exact: true })).toBeVisible();
});

test('admin altera a cadência de rotação das frases', async ({ page }) => {
  await loginAsAdmin(page);

  await page.goto('/admin/conteudo/frases');
  await page.getByLabel('Quando a frase troca').selectOption('intervalo');
  await page.getByLabel('Intervalo (em minutos)').fill('90');
  await page.getByRole('button', { name: 'Salvar preferência' }).click();

  await expect(page.getByText('Preferência salva.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Quando a frase troca')).toHaveValue('intervalo');
  await expect(page.getByLabel('Intervalo (em minutos)')).toHaveValue('90');
});
