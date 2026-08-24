import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers';

test('admin cadastra um novo Irmão, ganha acesso ao Portal e o Irmão consegue logar', async ({
  page,
}) => {
  // Esse teste passa por várias rotas ainda não compiladas nesta execução
  // (novo → detalhe do Irmão → lista → login → dashboard) — o compile
  // on-demand do Next dev, somado à carga do sandbox, já estourou o
  // timeout padrão de 90s (playwright.config.ts) mesmo com a lógica
  // correta (confirmado rodando este spec isolado, sem falha).
  test.setTimeout(150_000);
  await loginAsAdmin(page);

  const nome = `Irmão E2E ${Date.now()}`;
  const cim = `E2E-${Date.now()}`;
  const email = `${cim.toLowerCase()}@vl6.test`;

  await page.goto('/admin/pessoas/irmaos/novo');
  await page.getByLabel('Nome completo').fill(nome);
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('CIM', { exact: true }).fill(cim);
  await page.getByLabel('Grau').selectOption('mestre');
  // Mestre exige as três datas maçônicas em ordem cronológica (validação de
  // coerência do memberSchema — docs/architecture/06).
  await page.getByLabel('Data de iniciação').fill('2015-01-01');
  await page.getByLabel('Data de elevação').fill('2016-01-01');
  await page.getByLabel('Data de exaltação').fill('2017-01-01');
  await page.getByRole('button', { name: 'Salvar' }).click();

  // Cadastro cria o Irmão E o acesso na mesma operação — sem redirect
  // automático, a senha temporária só é mostrada uma vez nesta tela.
  await expect(page.getByText('Senha temporária')).toBeVisible();
  const temporaryPassword = await page.locator('p.font-mono').innerText();
  expect(temporaryPassword.trim().length).toBeGreaterThan(0);

  await page.getByRole('link', { name: 'Ver cadastro do Irmão' }).click();
  await expect(page).toHaveURL(/\/admin\/pessoas\/irmaos\/[^/]+$/);
  await expect(page.getByRole('heading', { name: nome })).toBeVisible();

  await page.goto('/admin/pessoas/irmaos');
  await expect(page.getByText(nome)).toBeVisible();

  // O Irmão consegue logar com o próprio e-mail e a senha temporária —
  // valida que a conta Firebase Auth + User Firestore foram criadas de
  // verdade e vinculadas ao Member (não só o cadastro do Irmão).
  await page.getByRole('button', { name: 'Sair' }).click();
  await page.waitForURL(/\/login/);
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha', { exact: true }).fill(temporaryPassword.trim());
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL((url) => url.pathname === '/dashboard', { timeout: 30000 });
});

test('admin cadastra Irmão sem acesso, ativa depois e consegue bloquear sem apagar o cadastro', async ({
  page,
}) => {
  await loginAsAdmin(page);

  // Nome sem a palavra "acesso" de propósito — evita colidir com o texto
  // do badge "Sem acesso"/"Ativa" na lista (Playwright faz match de texto
  // sem diferenciar maiúsculas/minúsculas por padrão).
  const nome = `Irmão Pendente ${Date.now()}`;
  const cim = `PD-${Date.now()}`;
  const email = `${cim.toLowerCase()}@vl6.test`;

  await page.goto('/admin/pessoas/irmaos/novo');
  await page.getByLabel('Nome completo').fill(nome);
  await page.getByLabel('E-mail', { exact: true }).fill(email);
  await page.getByLabel('CIM', { exact: true }).fill(cim);
  await page.getByLabel('Data de iniciação').fill('2020-01-01');
  await page.getByLabel('Criar acesso ao Portal para este Irmão').uncheck();
  await page.getByRole('button', { name: 'Salvar' }).click();

  // Espera a confirmação real do cadastro sem acesso antes de navegar —
  // sem isso não há como saber se a Server Action já terminou.
  await expect(page.getByText('Irmão cadastrado sem acesso ao Portal.')).toBeVisible();

  await page.goto('/admin/pessoas/irmaos');
  const row = page.locator('tr', { hasText: nome });
  await expect(row.getByText('Sem acesso', { exact: true })).toBeVisible();

  await row.getByText(nome).click();
  await expect(page.getByText('ainda não tem acesso ao Portal')).toBeVisible();

  // Ativa o acesso depois — mesma lógica de criação, mas para um Member já existente.
  await page.getByRole('button', { name: 'Ativar acesso' }).click();
  await expect(page.getByText('Acesso criado.')).toBeVisible();

  await page.goto('/admin/pessoas/irmaos');
  await expect(
    page.locator('tr', { hasText: nome }).getByText('Ativa', { exact: true }),
  ).toBeVisible();

  // Bloqueia o acesso sem apagar o cadastro do Irmão.
  await row.getByText(nome).click();
  await page.getByRole('button', { name: 'Bloquear' }).click();
  await expect(
    page.getByLabel('Editar Irmão').getByText('Bloqueada', { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: nome })).toBeVisible();
});
