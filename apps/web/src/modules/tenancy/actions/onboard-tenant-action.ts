'use server';

import { revalidatePath } from 'next/cache';
import { computeUserClaims } from '@vl6/domain';
import { createTenantSchema, TENANT_MODULE_KEYS } from '@vl6/shared';
import { createServerContainer, getAdminAuth } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';

export interface OnboardTenantActionState {
  error: string | null;
  tenantNome: string | null;
  adminEmail: string | null;
  temporaryPassword: string | null;
}

function generateTemporaryPassword(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
}

/**
 * Provisiona uma nova Loja de ponta a ponta a partir do painel do
 * Administrador Geral: `Tenant` + branding/settings padrão + papéis de
 * fábrica (`CreateTenantUseCase`), depois a primeira conta `User` (papel
 * `admin`, `BootstrapTenantAdminUseCase`). Sem Cloud Functions implantadas
 * (docs/architecture/10-roadmap.md, plano Spark), replica manualmente o
 * cálculo de Custom Claims que `onUserWritten` faria — mesmo padrão de
 * scripts/seed-tenant.ts — para o Administrador da Loja nova já nascer
 * com permissões propagadas.
 */
export async function onboardTenantAction(
  _prevState: OnboardTenantActionState,
  formData: FormData,
): Promise<OnboardTenantActionState> {
  const session = await requireSession();

  const parsed = createTenantSchema.safeParse({
    nome: formData.get('nome'),
    numero: formData.get('numero'),
    potencia: formData.get('potencia'),
    dominio: formData.get('dominio') || null,
    subdominio: formData.get('subdominio'),
    endereco: null,
    telefone: null,
    whatsapp: null,
    site: null,
    email: formData.get('email'),
    modulosHabilitados: TENANT_MODULE_KEYS.filter((key) => formData.get(`modulo_${key}`) === 'on'),
  });
  const adminEmail = String(formData.get('adminEmail') ?? '');
  const empty = { tenantNome: null, adminEmail: null, temporaryPassword: null };
  if (!parsed.success) {
    return { ...empty, error: 'Dados inválidos. Verifique os campos obrigatórios.' };
  }
  if (!adminEmail) {
    return { ...empty, error: 'Informe o e-mail do primeiro Administrador da Loja.' };
  }

  const container = createServerContainer();

  const tenantResult = await container.useCases.createTenant.execute(
    session.authContext,
    parsed.data,
  );
  if (!tenantResult.ok) {
    return { ...empty, error: tenantResult.error.message };
  }
  const tenant = tenantResult.value;

  const temporaryPassword = generateTemporaryPassword();
  const authUser = await getAdminAuth()
    .createUser({ email: adminEmail, password: temporaryPassword })
    .catch((error: unknown) =>
      error instanceof Error ? error.message : 'Falha ao criar a conta.',
    );
  if (typeof authUser === 'string') {
    return {
      ...empty,
      error: `Loja "${tenant.nome}" criada, mas falhou ao criar o Administrador: ${authUser}`,
    };
  }

  const adminResult = await container.useCases.bootstrapTenantAdmin.execute(session.authContext, {
    uid: authUser.uid,
    tenantId: tenant.id,
    email: adminEmail,
  });
  if (!adminResult.ok) {
    return {
      ...empty,
      error: `Loja "${tenant.nome}" criada, mas falhou ao criar o Administrador: ${adminResult.error.message}`,
    };
  }

  const adminRole = await container.repositories.role.findById(adminResult.value.roleId);
  if (adminRole) {
    await getAdminAuth().setCustomUserClaims(
      authUser.uid,
      computeUserClaims(adminResult.value, adminRole),
    );
  }

  revalidatePath('/plataforma');
  return { error: null, tenantNome: tenant.nome, adminEmail, temporaryPassword };
}
