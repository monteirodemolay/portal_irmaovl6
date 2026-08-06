/**
 * Provisiona a primeira conta de Administrador Geral (`super_admin`) da
 * plataforma — cross-tenant, usada para operar o onboarding de novas Lojas
 * e o futuro painel administrativo geral (docs/architecture/08 §8.3).
 * Roda uma única vez por ambiente.
 *
 * Uso:
 *   FIREBASE_PROJECT_ID=... FIREBASE_CLIENT_EMAIL=... FIREBASE_PRIVATE_KEY=... \
 *   PLATFORM_ADMIN_EMAIL=voce@exemplo.com PLATFORM_ADMIN_PASSWORD=troque-esta-senha \
 *   pnpm tsx scripts/seed-platform-admin.ts
 */
import type { AuthContext } from '@vl6/domain';
import { createServerContainer, getAdminAuth, syncUserClaims } from '@vl6/infra';
import { PLATFORM_TENANT_ID } from '@vl6/shared';

async function main() {
  const email = process.env.PLATFORM_ADMIN_EMAIL;
  const password = process.env.PLATFORM_ADMIN_PASSWORD;
  if (!email || !password) {
    console.error('Defina PLATFORM_ADMIN_EMAIL e PLATFORM_ADMIN_PASSWORD antes de rodar o seed.');
    process.exit(1);
  }

  const container = createServerContainer();

  // Mesmo contexto sintético de bootstrap usado em scripts/seed-tenant.ts —
  // só existe aqui, nunca em requisição de usuário real.
  const bootstrapCtx: AuthContext = {
    uid: 'seed-script',
    tenantId: PLATFORM_TENANT_ID,
    roleId: 'platform-super-admin',
    permissions: ['tenant:manage'],
  };

  console.log(`Criando conta Firebase Auth para ${email}...`);
  const authUser = await getAdminAuth().createUser({ email, password });

  console.log('Criando papel super_admin (se ainda não existir) e a conta no Firestore...');
  const result = await container.useCases.bootstrapPlatformAdmin.execute(bootstrapCtx, {
    uid: authUser.uid,
    email,
  });

  if (!result.ok) {
    console.error(`Falha ao criar o Administrador Geral: ${result.error.message}`);
    process.exit(1);
  }

  const role = await container.repositories.role.findById(result.value.roleId);
  if (role) {
    await syncUserClaims(result.value, role);
  }

  console.log('\nSeed concluído.');
  console.log(`  Administrador Geral: ${email}`);
}

main().catch((error: unknown) => {
  console.error('Erro inesperado no seed:', error);
  process.exit(1);
});
