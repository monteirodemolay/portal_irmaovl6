'use server';

import { revalidatePath } from 'next/cache';
import { memberSelfEditSchema, type MemberSelfEditValues } from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';
import type { MemberActionState } from './member-actions';

export async function updateMyProfileAction(
  _prevState: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const session = await requireSession();

  let input: MemberSelfEditValues;
  try {
    input = memberSelfEditSchema.parse({
      nomeMaconico: formData.get('nomeMaconico') || null,
      fotoUrl: null,
      telefone: formData.get('telefone') || null,
      whatsapp: formData.get('whatsapp') || null,
      endereco: formData.get('cep')
        ? {
            logradouro: formData.get('logradouro') ?? '',
            numero: formData.get('enderecoNumero') ?? '',
            bairro: formData.get('bairro') ?? '',
            cidade: formData.get('cidade') ?? '',
            estado: formData.get('estado') ?? '',
            pais: formData.get('pais') || 'Brasil',
            cep: formData.get('cep'),
          }
        : null,
      profissao: formData.get('profissao') || null,
      empresa: formData.get('empresa') || null,
      estadoCivil: formData.get('estadoCivil') || null,
      biografia: formData.get('biografia') || null,
      redesSociais: {
        instagram: formData.get('instagram') || null,
        facebook: formData.get('facebook') || null,
        linkedin: formData.get('linkedin') || null,
      },
    });
  } catch {
    return { error: 'Dados inválidos.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.updateMyProfile.execute(session.authContext, input);
  if (!result.ok) {
    return { error: result.error.message };
  }

  revalidatePath('/perfil');
  return { error: null };
}
