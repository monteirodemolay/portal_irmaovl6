'use server';

import { revalidatePath } from 'next/cache';
import { createServerContainer, getAdminAuth, syncUserClaims } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';

export interface InviteUserActionState {
  error: string | null;
  temporaryPassword: string | null;
}

function generateTemporaryPassword(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
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

  revalidatePath('/admin/usuarios');
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

  revalidatePath('/admin/usuarios');
}
