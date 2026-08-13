'use server';

import { revalidatePath } from 'next/cache';
import {
  memberSelfEditSchema,
  normalizeConjugeFields,
  type MemberSelfEditValues,
} from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';
import { resolveProfissaoFromFormData } from '@/lib/membership/professions';

export interface SelfProfileActionState {
  error: string | null;
}

export async function updateMyProfileAction(
  _prevState: SelfProfileActionState,
  formData: FormData,
): Promise<SelfProfileActionState> {
  const session = await requireSession();

  let input: MemberSelfEditValues;
  try {
    input = normalizeConjugeFields(
      memberSelfEditSchema.parse({
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
        profissao: resolveProfissaoFromFormData(formData),
        empresa: formData.get('empresa') || null,
        estadoCivil: formData.get('estadoCivil') || null,
        conjugeNome: formData.get('conjugeNome') || null,
        conjugeDataNascimento: formData.get('conjugeDataNascimento') || null,
        biografia: formData.get('biografia') || null,
        redesSociais: {
          instagram: formData.get('instagram') || null,
          facebook: formData.get('facebook') || null,
          linkedin: formData.get('linkedin') || null,
        },
      }),
    );
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
