'use server';

import { revalidatePath } from 'next/cache';
import { createServerContainer, getAdminAuth, syncUserClaims } from '@vl6/infra';
import type { User } from '@vl6/domain';
import { requireSession } from '@/lib/auth/require-session';

export interface ApproveMemberAccessClaimResult {
  error: string | null;
  /**
   * Link de redefinição de senha (Firebase Auth) — a conta nasce sem
   * senha definida, então isto é o único jeito do Irmão entrar pela
   * primeira vez. `null` quando a conta foi criada mas o link falhou ao
   * gerar (raro); nesse caso o Irmão ainda consegue usar "Esqueci minha
   * senha" no login normalmente, já que a conta já existe.
   */
  resetLink: string | null;
}

/**
 * Aprova uma solicitação de acesso — cria a conta Firebase Auth/`User`
 * (sem senha; o Irmão define a própria na primeira vez, pelo link de
 * redefinição) e vincula `Member.userId`. Mesma divisão de
 * responsabilidade que o antigo fluxo de "Reivindicar" já usava: o domínio
 * só decide QUE a solicitação foi aprovada, a Server Action cuida da
 * infraestrutura (Firebase Admin).
 */
export async function approveMemberAccessClaimAction(
  claimId: string,
): Promise<ApproveMemberAccessClaimResult> {
  const session = await requireSession();
  const container = createServerContainer();

  const result = await container.useCases.approveMemberAccessClaim.execute(
    session.authContext,
    claimId,
  );
  if (!result.ok) {
    return { error: result.error.message, resetLink: null };
  }
  const { claim, member } = result.value;

  const role = await container.repositories.role.findByKey(session.authContext.tenantId, 'membro');
  if (!role) {
    return { error: 'Papel de acesso padrão não encontrado. Fale com o suporte.', resetLink: null };
  }

  const authUser = await getAdminAuth()
    .createUser({ email: claim.emailSolicitado })
    .catch((error: unknown) =>
      error instanceof Error ? error.message : 'Falha ao criar a conta.',
    );
  if (typeof authUser === 'string') {
    return { error: authUser, resetLink: null };
  }

  const now = new Date();
  const user: User = {
    id: authUser.uid,
    tenantId: session.authContext.tenantId,
    email: claim.emailSolicitado,
    memberId: member.id,
    roleId: role.id,
    mfaHabilitado: false,
    ultimoLogin: null,
    statusConta: 'active',
    createdAt: now,
    updatedAt: now,
    createdBy: session.authContext.uid,
    updatedBy: session.authContext.uid,
    deletedAt: null,
    status: 'active',
    ativo: true,
  };
  await container.repositories.user.create(user);
  await syncUserClaims(user, role);

  await container.repositories.member.update({
    ...member,
    email: claim.emailSolicitado,
    userId: authUser.uid,
    updatedAt: now,
    updatedBy: session.authContext.uid,
  });

  const resetLink = await getAdminAuth()
    .generatePasswordResetLink(claim.emailSolicitado)
    .catch(() => null);

  revalidatePath('/admin/pessoas/solicitacoes-acesso');
  return { error: null, resetLink };
}

export async function rejectMemberAccessClaimAction(
  claimId: string,
  motivoRejeicao: string,
): Promise<{ error: string | null }> {
  const session = await requireSession();
  const container = createServerContainer();

  const result = await container.useCases.rejectMemberAccessClaim.execute(
    session.authContext,
    claimId,
    motivoRejeicao,
  );
  if (!result.ok) {
    return { error: result.error.message };
  }

  revalidatePath('/admin/pessoas/solicitacoes-acesso');
  return { error: null };
}
