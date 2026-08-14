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

/**
 * Cada card do "Meu Espaço" edita só um subconjunto dos campos de
 * autoatendimento — `formData.has(key)` distingue "não faz parte deste
 * card" (mantém o valor atual) de "presente e limpo pelo usuário" (grava
 * vazio/null), mesma técnica de `central-actions.ts`.
 */
function textOrCurrent(formData: FormData, key: string, current: string | null): string | null {
  if (!formData.has(key)) return current;
  const value = formData.get(key);
  return typeof value === 'string' && value.trim() ? value : null;
}

export async function updateMyProfileAction(
  _prevState: SelfProfileActionState,
  formData: FormData,
): Promise<SelfProfileActionState> {
  const session = await requireSession();
  const container = createServerContainer();

  const member = await container.repositories.member.findByUserId(
    session.authContext.tenantId,
    session.user.id,
  );
  if (!member) return { error: 'Cadastro de Irmão não encontrado.' };

  const profissao = formData.has('profissao')
    ? resolveProfissaoFromFormData(formData)
    : member.profissao;

  const endereco = formData.has('cep')
    ? {
        logradouro: formData.get('logradouro') ?? '',
        numero: formData.get('enderecoNumero') ?? '',
        bairro: formData.get('bairro') ?? '',
        cidade: formData.get('cidade') ?? '',
        estado: formData.get('estado') ?? '',
        pais: formData.get('pais') || 'Brasil',
        cep: formData.get('cep'),
      }
    : member.endereco;

  let input: MemberSelfEditValues;
  try {
    input = normalizeConjugeFields(
      memberSelfEditSchema.parse({
        telefone: textOrCurrent(formData, 'telefone', member.telefone),
        whatsapp: textOrCurrent(formData, 'whatsapp', member.whatsapp),
        endereco,
        profissao,
        empresa: textOrCurrent(formData, 'empresa', member.empresa),
        estadoCivil: formData.has('estadoCivil')
          ? formData.get('estadoCivil') || null
          : member.estadoCivil,
        conjugeNome: formData.has('conjugeNome')
          ? textOrCurrent(formData, 'conjugeNome', member.conjugeNome)
          : member.conjugeNome,
        conjugeDataNascimento: formData.has('conjugeDataNascimento')
          ? formData.get('conjugeDataNascimento') || null
          : member.conjugeDataNascimento,
        biografia: textOrCurrent(formData, 'biografia', member.biografia),
        redesSociais: member.redesSociais,
      }),
    );
  } catch {
    return { error: 'Dados inválidos.' };
  }

  const result = await container.useCases.updateMyProfile.execute(session.authContext, input);
  if (!result.ok) {
    return { error: result.error.message };
  }

  revalidatePath('/irmaos', 'layout');
  return { error: null };
}
