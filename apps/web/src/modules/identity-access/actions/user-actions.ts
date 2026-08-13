'use server';

import { revalidatePath } from 'next/cache';
import { hasPermission } from '@vl6/domain';
import type { UserAccountStatus } from '@vl6/domain';
import { createServerContainer, getAdminAuth, syncUserClaims } from '@vl6/infra';
import { generateTemporaryPassword } from '@/lib/auth/generate-temporary-password';
import { requireSession } from '@/lib/auth/require-session';

export interface InviteUserActionState {
  error: string | null;
  temporaryPassword: string | null;
}

/**
 * Cria a conta Firebase Auth com uma senha temporária e a conta `User` no
 * Firestore. Sem serviço de e-mail transacional configurado ainda
 * (docs/architecture/10-roadmap.md — v1.1+), a senha é mostrada uma única
 * vez na tela para o Administrador repassar ao Irmão com segurança; ele
 * pode trocá-la a qualquer momento pelo fluxo de recuperação de senha.
 *
 * Sem Cloud Functions implantadas (plano Spark), não há `onUserWritten`
 * sincronizando Custom Claims sozinho — chama `syncUserClaims` aqui.
 */
export async function inviteUserAction(
  _prevState: InviteUserActionState,
  formData: FormData,
): Promise<InviteUserActionState> {
  const session = await requireSession();

  const email = String(formData.get('email') ?? '');
  const roleId = String(formData.get('roleId') ?? '');
  if (!email || !roleId) {
    return { error: 'Preencha e-mail e papel.', temporaryPassword: null };
  }

  const temporaryPassword = generateTemporaryPassword();
  const authUser = await getAdminAuth()
    .createUser({ email, password: temporaryPassword })
    .catch((error: unknown) => {
      return error instanceof Error ? error.message : 'Falha ao criar a conta.';
    });
  if (typeof authUser === 'string') {
    return { error: authUser, temporaryPassword: null };
  }

  const container = createServerContainer();
  const result = await container.useCases.inviteUser.execute(session.authContext, {
    uid: authUser.uid,
    email,
    roleId,
    memberId: null,
  });
  if (!result.ok) {
    return { error: result.error.message, temporaryPassword: null };
  }

  const role = await container.repositories.role.findById(roleId);
  if (role) {
    await syncUserClaims(result.value, role);
  }

  revalidatePath('/admin/pessoas/usuarios');
  return { error: null, temporaryPassword };
}

/** Sem `onUserWritten` (ver `inviteUserAction`), sincroniza claims aqui após trocar o papel. */
export async function assignRoleAction(userId: string, formData: FormData): Promise<void> {
  const session = await requireSession();
  const roleId = String(formData.get('roleId') ?? '');

  const container = createServerContainer();
  const result = await container.useCases.assignRole.execute(session.authContext, {
    userId,
    roleId,
  });
  if (!result.ok) {
    throw new Error(result.error.message);
  }

  const role = await container.repositories.role.findById(roleId);
  if (role) {
    await syncUserClaims(result.value, role);
  }

  revalidatePath('/admin/pessoas/usuarios');
  revalidatePath('/admin/pessoas/irmaos/[memberId]', 'page');
}

export interface ResetPasswordActionState {
  error: string | null;
  temporaryPassword: string | null;
}

/**
 * Gera uma nova senha temporária para um usuário existente e a define
 * diretamente no Firebase Auth (`updateUser`) — mesmo padrão de
 * `inviteUserAction`: sem serviço de e-mail transacional, a senha é
 * mostrada uma única vez para o Administrador repassar com segurança.
 */
export async function resetUserPasswordAction(
  userId: string,
  _prevState: ResetPasswordActionState,
  _formData: FormData,
): Promise<ResetPasswordActionState> {
  const session = await requireSession();
  if (!hasPermission(session.authContext, 'user:manage')) {
    return { error: 'Permissão ausente: user:manage.', temporaryPassword: null };
  }

  const container = createServerContainer();
  const user = await container.repositories.user.findById(userId);
  if (!user || user.tenantId !== session.authContext.tenantId) {
    return { error: 'Usuário não encontrado.', temporaryPassword: null };
  }

  const temporaryPassword = generateTemporaryPassword();
  await getAdminAuth()
    .updateUser(userId, { password: temporaryPassword })
    .catch((error: unknown) => {
      throw error instanceof Error ? error : new Error('Falha ao redefinir a senha.');
    });

  revalidatePath('/admin/pessoas/usuarios');
  revalidatePath('/admin/pessoas/irmaos/[memberId]', 'page');
  return { error: null, temporaryPassword };
}

/**
 * Bloqueia/reativa um usuário — persiste `statusConta` (fonte de verdade
 * checada em cada login por `AuthenticateUserUseCase`/`getCurrentSession`)
 * e também desabilita a conta no Firebase Auth como segunda camada de
 * defesa (impede inclusive a troca de senha/token refresh de uma sessão
 * já aberta).
 */
export async function setUserStatusAction(
  userId: string,
  statusConta: UserAccountStatus,
  _formData: FormData,
): Promise<void> {
  const session = await requireSession();

  const container = createServerContainer();
  const result = await container.useCases.setUserStatus.execute(session.authContext, {
    userId,
    statusConta,
  });
  if (!result.ok) {
    throw new Error(result.error.message);
  }

  await getAdminAuth().updateUser(userId, { disabled: statusConta === 'blocked' });

  revalidatePath('/admin/pessoas/usuarios');
  revalidatePath('/admin/pessoas/irmaos/[memberId]', 'page');
}
