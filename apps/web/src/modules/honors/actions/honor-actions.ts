'use server';

import { revalidatePath } from 'next/cache';
import {
  HONOR_TYPE_KEYS,
  MEMBER_TITLE_KEYS,
  type HonorTypeKey,
  type MemberTitleKey,
} from '@vl6/shared';
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

export interface HonorActionState {
  error: string | null;
}

/**
 * Cadastro de uma Honraria/Condecoração — cobre "Honrarias e Condecorações"
 * (levantamento §3), "Membros Honorários da VL6" (§5) e "Distinções que a
 * VL6 pode conceder" (§6): as três seções compartilham o mesmo formato
 * (nome oficial, tipo, instituição concedente, data), diferindo só em quem é
 * o homenageado — um Irmão já cadastrado (`memberId`) ou alguém externo
 * (`homenageadoNome`), nunca os dois — ver `RegisterHonorUseCase`.
 */
export async function registerHonorAction(
  memberId: string,
  _prevState: HonorActionState,
  formData: FormData,
): Promise<HonorActionState> {
  const session = await requireSession();

  const tipo = String(formData.get('tipo') ?? '');
  if (!HONOR_TYPE_KEYS.includes(tipo as HonorTypeKey)) {
    return { error: 'Selecione um tipo de honraria válido.' };
  }
  const nomeOficial = String(formData.get('nomeOficial') ?? '').trim();
  const instituicaoConcedente = String(formData.get('instituicaoConcedente') ?? '').trim();
  const dataRaw = String(formData.get('data') ?? '');
  const numeroAto = String(formData.get('numeroAto') ?? '').trim();
  const motivo = String(formData.get('motivo') ?? '').trim();
  const descricaoHistorica = String(formData.get('descricaoHistorica') ?? '').trim();

  const container = createServerContainer();
  const result = await container.useCases.registerHonor.execute(session.authContext, {
    memberId,
    homenageadoNome: null,
    homenageadoLojaOrigem: null,
    homenageadoOriente: null,
    nomeOficial,
    tipo: tipo as HonorTypeKey,
    instituicaoConcedente,
    data: dataRaw ? new Date(`${dataRaw}T00:00:00`) : null,
    numeroAto: numeroAto || null,
    motivo: motivo || null,
    descricaoHistorica: descricaoHistorica || null,
    diplomaFileId: null,
    fotoEntregaFileId: null,
  });
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/admin/pessoas/irmaos');
  revalidatePath(`/irmaos/${memberId}`);
  return { error: null };
}

/** Remove (soft delete) uma honraria cadastrada por engano — ver `RemoveHonorUseCase`. */
export async function removeHonorAction(honorId: string, memberId: string): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  await container.useCases.removeHonor.execute(session.authContext, honorId);

  revalidatePath('/admin/pessoas/irmaos');
  revalidatePath(`/irmaos/${memberId}`);
}

export interface PhilosophicalJourneyActionState {
  error: string | null;
}

/**
 * Cadastro de um Grau Filosófico/Corpo Maçônico (levantamento §4 — Rito
 * Escocês Antigo e Aceito, Rito de York etc.). `visivel` é decidido pelo
 * Administrador no ato do cadastro: por padrão fica oculto do Perfil
 * público (dado sensível/sigiloso), exigindo autorização explícita do
 * Irmão pra aparecer — ver `RegisterPhilosophicalJourneyUseCase`.
 */
export async function registerPhilosophicalJourneyAction(
  memberId: string,
  _prevState: PhilosophicalJourneyActionState,
  formData: FormData,
): Promise<PhilosophicalJourneyActionState> {
  const session = await requireSession();

  const rito = String(formData.get('rito') ?? '').trim();
  const corpoMaconico = String(formData.get('corpoMaconico') ?? '').trim();
  const grau = String(formData.get('grau') ?? '').trim();
  const instituicao = String(formData.get('instituicao') ?? '').trim();
  const dataRaw = String(formData.get('data') ?? '');
  const funcoesExercidas = String(formData.get('funcoesExercidas') ?? '').trim();
  const visivel = formData.get('visivel') === 'on';

  const container = createServerContainer();
  const result = await container.useCases.registerPhilosophicalJourney.execute(
    session.authContext,
    {
      memberId,
      rito,
      corpoMaconico: corpoMaconico || null,
      grau: grau || null,
      instituicao: instituicao || null,
      data: dataRaw ? new Date(`${dataRaw}T00:00:00`) : null,
      funcoesExercidas: funcoesExercidas || null,
      visivel,
    },
  );
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/admin/pessoas/irmaos');
  revalidatePath(`/irmaos/${memberId}`);
  return { error: null };
}

/** Remove (soft delete) um registro de grau filosófico — ver `RemovePhilosophicalJourneyUseCase`. */
export async function removePhilosophicalJourneyAction(
  journeyId: string,
  memberId: string,
): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  await container.useCases.removePhilosophicalJourney.execute(session.authContext, journeyId);

  revalidatePath('/admin/pessoas/irmaos');
  revalidatePath(`/irmaos/${memberId}`);
}
