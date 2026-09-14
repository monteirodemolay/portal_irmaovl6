'use server';

import { revalidatePath } from 'next/cache';
import { MEMBER_TITLE_KEYS, type MemberTitleKey } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';

export interface MemberTitleActionState {
  error: string | null;
}

/**
 * Cadastro de um Título/Condição Maçônica (Mestre Instalado, Benfeitor…) —
 * ver `RegisterMemberTitleUseCase`. Sempre uma ação da Secretaria/
 * Administração, disparada de `MemberTitlesCard`.
 */
export async function registerMemberTitleAction(
  memberId: string,
  _prevState: MemberTitleActionState,
  formData: FormData,
): Promise<MemberTitleActionState> {
  const session = await requireSession();

  const titulo = String(formData.get('titulo') ?? '');
  if (!MEMBER_TITLE_KEYS.includes(titulo as MemberTitleKey)) {
    return { error: 'Selecione um título válido.' };
  }
  const tituloOutro = String(formData.get('tituloOutro') ?? '').trim();
  if (titulo === 'outro' && !tituloOutro) {
    return { error: 'Descreva o nome do título quando escolher "Outro".' };
  }
  const dataConcessaoRaw = String(formData.get('dataConcessao') ?? '');
  const fundamento = String(formData.get('fundamento') ?? '').trim();

  const container = createServerContainer();
  const result = await container.useCases.registerMemberTitle.execute(session.authContext, {
    memberId,
    titulo: titulo as MemberTitleKey,
    tituloOutro: titulo === 'outro' ? tituloOutro : null,
    dataConcessao: dataConcessaoRaw ? new Date(`${dataConcessaoRaw}T00:00:00`) : null,
    fundamento: fundamento || null,
  });
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/admin/pessoas/irmaos');
  revalidatePath(`/irmaos/${memberId}`);
  return { error: null };
}

/** Remove (soft delete) um título cadastrado por engano — ver `RemoveMemberTitleUseCase`. */
export async function removeMemberTitleAction(titleId: string, memberId: string): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  await container.useCases.removeMemberTitle.execute(session.authContext, titleId);

  revalidatePath('/admin/pessoas/irmaos');
  revalidatePath(`/irmaos/${memberId}`);
}
