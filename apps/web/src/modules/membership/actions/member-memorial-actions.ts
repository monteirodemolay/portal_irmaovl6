'use server';

import { revalidatePath } from 'next/cache';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';
import type { ProfileFieldActionState } from '../components/profile-fields/action-state';

/** Mensagem de homenagem da página In Memoriam — só existe quando `situacao === 'falecido'`, só o Administrador edita. */
export async function updateMemberMemorialMessageAction(
  memberId: string,
  _prevState: ProfileFieldActionState,
  formData: FormData,
): Promise<ProfileFieldActionState> {
  const session = await requireSession();
  const container = createServerContainer();

  const mensagemHomenagem = String(formData.get('mensagemHomenagem') ?? '').trim() || null;

  const result = await container.useCases.updateMemberMemorialMessage.execute(
    session.authContext,
    memberId,
    mensagemHomenagem,
  );
  if (!result.ok) {
    return { error: result.error.message };
  }

  revalidatePath(`/admin/pessoas/irmaos/${memberId}`);
  revalidatePath(`/irmaos/${memberId}`);
  return { error: null };
}
