/**
 * Provisiona o tenant inicial da plataforma — a Loja Maçônica Verdadeira
 * Luz nº 06 — e sua primeira conta de Administrador. Roda uma única vez por
 * ambiente (produção ou emulador).
 *
 * Uso:
 *   FIREBASE_PROJECT_ID=... FIREBASE_CLIENT_EMAIL=... FIREBASE_PRIVATE_KEY=... \
 *   ADMIN_EMAIL=admin@vl6.org.br ADMIN_PASSWORD=troque-esta-senha \
 *   pnpm tsx scripts/seed-tenant.ts
 *
 * Contra o emulador, basta setar FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 e
 * FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 (não precisa de credenciais).
 */
import type { AuthContext } from '@vl6/domain';
import { createServerContainer, getAdminAuth } from '@vl6/infra';

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    console.error('Defina ADMIN_EMAIL e ADMIN_PASSWORD antes de rodar o seed.');
    process.exit(1);
  }

  const container = createServerContainer();

  // Contexto "plataforma" — só usado neste script de bootstrap, nunca em
  // requisição de usuário real (docs/architecture/08 §8.3, super_admin).
  const bootstrapCtx: AuthContext = {
    uid: 'seed-script',
    tenantId: 'platform',
    roleId: 'platform-super-admin',
    permissions: ['tenant:manage'],
  };

  console.log('Criando tenant "Loja Maçônica Verdadeira Luz nº 06"...');
  const tenantResult = await container.useCases.createTenant.execute(bootstrapCtx, {
    nome: 'Loja Maçônica Verdadeira Luz nº 06',
    numero: '6',
    potencia: process.env.TENANT_POTENCIA ?? 'GLEG',
    dominio: null,
    subdominio: 'vl6',
    endereco: null,
    telefone: null,
    whatsapp: null,
    site: null,
    email: adminEmail,
    modulosHabilitados: ['membership', 'governance', 'content'],
  });

  if (!tenantResult.ok) {
    console.error(`Falha ao criar o tenant: ${tenantResult.error.message}`);
    process.exit(1);
  }
  const tenant = tenantResult.value;
  console.log(`Tenant criado: ${tenant.id} (subdomínio: ${tenant.subdominio})`);

  console.log(`Criando conta Firebase Auth para ${adminEmail}...`);
  const authUser = await getAdminAuth().createUser({ email: adminEmail, password: adminPassword });

  console.log('Criando conta Administrador no Firestore...');
  const adminResult = await container.useCases.bootstrapTenantAdmin.execute(bootstrapCtx, {
    uid: authUser.uid,
    tenantId: tenant.id,
    email: adminEmail,
  });

  if (!adminResult.ok) {
    console.error(`Falha ao criar o admin: ${adminResult.error.message}`);
    process.exit(1);
  }

  console.log('\nSeed concluído.');
  console.log(`  Tenant:     ${tenant.nome} (${tenant.id})`);
  console.log(`  Subdomínio: ${tenant.subdominio}.portaldoirmao.app`);
  console.log(`  Admin:      ${adminEmail}`);
}

main().catch((error: unknown) => {
  console.error('Erro inesperado no seed:', error);
  process.exit(1);
});
