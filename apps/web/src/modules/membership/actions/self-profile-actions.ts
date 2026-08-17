'use server';

import { revalidatePath } from 'next/cache';
import * as Sentry from '@sentry/nextjs';
import {
  errorToLogContext,
  logger,
  memberSelfEditSchema,
  normalizeConjugeFields,
  type MemberSelfEditValues,
} from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';
import { uploadMemberPhoto, validatePhotoFile } from '@/lib/membership/member-photo-upload';
import { resolveProfissaoFromFormData } from '@/lib/membership/professions';
import type { ProfileFieldActionState } from '@/modules/membership/components/profile-fields/action-state';

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

/**
 * Autoatendimento — o próprio Irmão troca a foto de perfil a partir do "Meu
 * Espaço". Mesma validação/upload de `updateMemberIdentityAction` (edição
 * administrativa), mas resolve o Member pelo `uid` da sessão em vez de
 * receber um `memberId` — padrão de "ação pessoal" já usado por
 * `updateMyProfileAction` acima: sem `requirePermission`, o critério é ser
 * dono do registro.
 */
export async function updateMyPhotoAction(
  _prevState: ProfileFieldActionState,
  formData: FormData,
): Promise<ProfileFieldActionState> {
  const session = await requireSession();
  const container = createServerContainer();

  const member = await container.repositories.member.findByUserId(
    session.authContext.tenantId,
    session.user.id,
  );
  if (!member) return { error: 'Cadastro de Irmão não encontrado.' };

  const file = formData.get('foto');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Selecione uma foto para enviar.' };
  }
  const photoError = validatePhotoFile(file);
  if (photoError) return { error: photoError };

  let fotoUrl: string;
  try {
    fotoUrl = await uploadMemberPhoto(file, session.authContext.tenantId, member.id);
  } catch (error) {
    logger.error('Falha ao enviar foto do Irmão (autoatendimento) para o storage', {
      route: 'updateMyPhotoAction',
      memberId: member.id,
      ...errorToLogContext(error),
    });
    Sentry.captureException(error, { tags: { route: 'updateMyPhotoAction:foto' } });
    return { error: 'Não foi possível enviar a foto. Tente novamente em instantes.' };
  }

  const result = await container.useCases.updateMyPhoto.execute(session.authContext, fotoUrl);
  if (!result.ok) {
    return { error: result.error.message };
  }

  revalidatePath('/irmaos', 'layout');
  return { error: null };
}
