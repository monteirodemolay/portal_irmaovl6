'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerContainer, getAdminAuth, syncUserClaims } from '@vl6/infra';
import type { User } from '@vl6/domain';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';
import { getClientIp } from '@/lib/api/get-client-ip';
import { RateLimiter } from '@/lib/api/rate-limiter';

export interface ClaimActionState {
  error: string | null;
}

const EMPTY_STATE: ClaimActionState = { error: null };

const claimRateLimiter = new RateLimiter();

/**
 * Cria a conta de acesso do próprio Irmão a partir do fluxo público
 * "Reivindicar meu cadastro" — sem sessão, então nada aqui passa por
 * `requireSession`/`AuthContext`. A prova de identidade é o Nome+CIM
 * checados por `ClaimMemberAccountUseCase`; o papel concedido é sempre o
 * de chave `'membro'` do tenant (nunca escolhido pelo próprio Irmão, ao
 * contrário do fluxo administrativo em `member-actions.ts`). Libera o
 * acesso na hora — de propósito, sem fila de aprovação do Administrador:
 * o passo extra (esperar aprovação + abrir um link externo do Firebase
 * pra só então definir senha) era a principal dificuldade relatada pelos
 * Irmãos mais velhos. Rate limit por IP continua — sem ele, o par
 * Nome+CIM (~5 dígitos) seria alvo fácil de tentativa por tentativa.
 */
export async function claimMemberAccountAction(
  _prevState: ClaimActionState,
  formData: FormData,
): Promise<ClaimActionState> {
  const current = await getCurrentTenant();
  if (!current) {
    return {
      ...EMPTY_STATE,
      error:
        'Não foi possível identificar sua Loja. Acesse pelo endereço do Portal enviado pela Secretaria.',
    };
  }

  const ip = getClientIp({ headers: await headers() });
  const limit = claimRateLimiter.check(`claim:${ip}`, { limit: 5, windowMs: 60 * 1000 });
  if (!limit.allowed) {
    return {
      ...EMPTY_STATE,
      error: 'Muitas tentativas. Aguarde um minuto antes de tentar de novo.',
    };
  }

  const memberId = String(formData.get('memberId') ?? '').trim();
  const cim = String(formData.get('cim') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const senha = String(formData.get('senha') ?? '');

  if (!memberId || !cim) {
    return { ...EMPTY_STATE, error: 'Escolha seu nome e informe a CIM.' };
  }
  if (!email.includes('@')) {
    return { ...EMPTY_STATE, error: 'Informe um e-mail válido.' };
  }
  if (senha.length < 6) {
    return { ...EMPTY_STATE, error: 'A senha precisa ter pelo menos 6 letras ou números.' };
  }

  const container = createServerContainer();
  const claimResult = await container.useCases.claimMemberAccount.execute(
    current.tenant.id,
    memberId,
    cim,
    email,
  );
  if (!claimResult.ok) {
    return { ...EMPTY_STATE, error: claimResult.error.message };
  }
  const member = claimResult.value;

  const role = await container.repositories.role.findByKey(current.tenant.id, 'membro');
  if (!role) {
    return {
      ...EMPTY_STATE,
      error: 'Papel de acesso padrão não encontrado. Fale com a Secretaria.',
    };
  }

  const authUser = await getAdminAuth()
    .createUser({ email, password: senha })
    .catch((error: unknown) =>
      error instanceof Error ? error.message : 'Falha ao criar a conta.',
    );
  if (typeof authUser === 'string') {
    return { ...EMPTY_STATE, error: authUser };
  }

  const now = new Date();
  const user: User = {
    id: authUser.uid,
    tenantId: current.tenant.id,
    email,
    memberId: member.id,
    roleId: role.id,
    mfaHabilitado: false,
    ultimoLogin: null,
    statusConta: 'active',
    createdAt: now,
    updatedAt: now,
    createdBy: authUser.uid,
    updatedBy: authUser.uid,
    deletedAt: null,
    status: 'active',
    ativo: true,
  };
  await container.repositories.user.create(user);
  await syncUserClaims(user, role);

  await container.repositories.member.update({
    ...member,
    userId: authUser.uid,
    updatedAt: now,
    updatedBy: authUser.uid,
  });

  redirect('/login?reivindicado=1');
}
