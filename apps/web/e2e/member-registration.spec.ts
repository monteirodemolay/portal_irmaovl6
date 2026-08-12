import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test('admin cadastra um novo Irmão, ganha acesso ao Portal e o Irmão consegue logar', async ({
  page,
}) => {
  await loginAsAdmin(page);

  const nome = `Irmão E2E ${Date.now()}`;
  const matricula = `E2E-${Date.now()}`;
  const email = `${matricula.toLowerCase()}@vl6.test`;

  await page.goto('/admin/irmaos/novo');
  await page.getByLabel('Nome completo').fill(nome);
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('Matrícula').fill(matricula);
  await page.getByLabel('Grau').selectOption('mestre');
  await page.getByRole('button', { name: 'Salvar' }).click();

  // Cadastro cria o Irmão E o acesso na mesma operação — sem redirect
  // automático, a senha temporária só é mostrada uma vez nesta tela.
  await expect(page.getByText('Senha temporária')).toBeVisible();
  const temporaryPassword = await page.locator('p.font-mono').innerText();
  expect(temporaryPassword.trim().length).toBeGreaterThan(0);

  await page.getByRole('link', { name: 'Ver cadastro do Irmão' }).click();
  await expect(page).toHaveURL(/\/admin\/irmaos\/[^/]+$/);
  await expect(page.getByRole('heading', { name: nome })).toBeVisible();

  await page.goto('/admin/irmaos');
  await expect(page.getByText(nome)).toBeVisible();

  // O Irmão consegue logar com o próprio e-mail e a senha temporária —
  // valida que a conta Firebase Auth + User Firestore foram criadas de
  // verdade e vinculadas ao Member (não só o cadastro do Irmão).
  await page.getByRole('button', { name: 'Sair' }).click();
  await page.waitForURL(/\/login/);
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill(temporaryPassword.trim());
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL((url) => url.pathname === '/dashboard', { timeout: 30000 });
});
