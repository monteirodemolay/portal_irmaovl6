'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type {
  BackfillArchiveBoardTermLinksResult,
  NormalizeBoardTermNamesResult,
} from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';
import { CUSTOM_CARGO_VALUE } from '../lib/cargo-constants';

export interface GovernanceActionState {
  error: string | null;
}

export interface NormalizeBoardTermNamesState {
  error: string | null;
  result: NormalizeBoardTermNamesResult | null;
}

export interface BackfillArchiveBoardTermLinksState {
  error: string | null;
  result: BackfillArchiveBoardTermLinksResult | null;
}

/**
 * Correção em massa, um clique: recalcula `boardTermId` de Eventos/itens do
 * Acervo VL6 que ficaram com `null` — acontece quando a data de
 * iniciação/elevação/exaltação de um Irmão é registrada antes de a Gestão
 * do ano corrente existir no Portal (`findByDate` não achava nada na hora).
 * Sem isso, "Iniciados/Elevados/Exaltados nesta Gestão" na página da Gestão
 * nunca mostra esse Irmão, mesmo a Gestão certa já cadastrada depois.
 */
export async function backfillArchiveBoardTermLinksAction(): Promise<BackfillArchiveBoardTermLinksState> {
  const session = await requireSession();
  const container = createServerContainer();

  const result = await container.useCases.backfillArchiveBoardTermLinks.execute(
    session.authContext,
  );
  if (!result.ok) return { error: result.error.message, result: null };

  revalidatePath('/admin/pessoas/gestoes');
  revalidatePath('/acervo/gestoes');
  return { error: null, result: result.value };
}

/**
 * Correção em massa, um clique: tira o prefixo "Gestão " redundante do
 * nome de toda gestão já cadastrada (a UI já antepõe essa palavra sozinha
 * em vários lugares — pedido direto do Administrador).
 */
export async function normalizeBoardTermNamesAction(): Promise<NormalizeBoardTermNamesState> {
  const session = await requireSession();
  const container = createServerContainer();

  const result = await container.useCases.normalizeBoardTermNames.execute(session.authContext);
  if (!result.ok) return { error: result.error.message, result: null };

  revalidatePath('/admin/pessoas/gestoes');
  return { error: null, result: result.value };
}

export async function createBoardTermAction(
  _prevState: GovernanceActionState,
  formData: FormData,
): Promise<GovernanceActionState> {
  const session = await requireSession();

  const nome = String(formData.get('nome') ?? '');
  const periodoInicio = new Date(String(formData.get('periodoInicio')));
  const periodoFim = new Date(String(formData.get('periodoFim')));
  const permitirSobreposicao = formData.get('permitirSobreposicao') === 'on';
  if (!nome || Number.isNaN(periodoInicio.getTime()) || Number.isNaN(periodoFim.getTime())) {
    return { error: 'Preencha nome e as duas datas do período.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.createBoardTerm.execute(session.authContext, {
    nome,
    periodoInicio,
    periodoFim,
    permitirSobreposicao,
  });
  if (!result.ok) {
    return { error: result.error.message };
  }

  revalidatePath('/admin/pessoas/gestoes');
  redirect(`/admin/pessoas/gestoes/${result.value.id}`);
}

export async function updateBoardTermAction(
  termId: string,
  _prevState: GovernanceActionState,
  formData: FormData,
): Promise<GovernanceActionState> {
  const session = await requireSession();

  const nome = String(formData.get('nome') ?? '');
  const periodoInicio = new Date(String(formData.get('periodoInicio')));
  const periodoFim = new Date(String(formData.get('periodoFim')));
  const permitirSobreposicao = formData.get('permitirSobreposicao') === 'on';
  if (!nome || Number.isNaN(periodoInicio.getTime()) || Number.isNaN(periodoFim.getTime())) {
    return { error: 'Preencha nome e as duas datas do período.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.updateBoardTerm.execute(session.authContext, termId, {
    nome,
    periodoInicio,
    periodoFim,
    permitirSobreposicao,
  });
  if (!result.ok) {
    return { error: result.error.message };
  }

  revalidatePath(`/admin/pessoas/gestoes/${termId}`);
  revalidatePath('/admin/pessoas/gestoes');
  return { error: null };
}

export async function assignBoardPositionAction(
  gestaoId: string,
  _prevState: GovernanceActionState,
  formData: FormData,
): Promise<GovernanceActionState> {
  const session = await requireSession();

  const cargoSelecionado = String(formData.get('cargo') ?? '').trim();
  const cargoPersonalizado = String(formData.get('cargoPersonalizado') ?? '').trim();
  const cargo = cargoSelecionado === CUSTOM_CARGO_VALUE ? cargoPersonalizado : cargoSelecionado;
  const memberId = String(formData.get('memberId'));
  const ordem = Number(formData.get('ordem') ?? 1);
  if (!cargo || !memberId) {
    return { error: 'Selecione o cargo e o Irmão.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.assignBoardPosition.execute(session.authContext, {
    gestaoId,
    cargo,
    memberId,
    ordem,
  });
  if (!result.ok) {
    return { error: result.error.message };
  }

  revalidatePath(`/admin/pessoas/gestoes/${gestaoId}`);
  return { error: null };
}

/**
 * Tira um Irmão de um cargo sem colocar outro no lugar — complementa
 * `assignBoardPositionAction` (que só troca quem ocupa um cargo de
 * ocorrência única) pros casos em que não há substituto ainda, ou pra
 * remover uma ocorrência extra de Diácono/Experto.
 */
export async function removeBoardPositionAction(
  gestaoId: string,
  assignmentId: string,
): Promise<void> {
  const session = await requireSession();

  const container = createServerContainer();
  const result = await container.useCases.removeBoardPosition.execute(session.authContext, {
    assignmentId,
  });
  if (!result.ok) {
    throw new Error(result.error.message);
  }

  revalidatePath(`/admin/pessoas/gestoes/${gestaoId}`);
}

export async function createCommitteeAction(
  gestaoId: string,
  _prevState: GovernanceActionState,
  formData: FormData,
): Promise<GovernanceActionState> {
  const session = await requireSession();

  const nome = String(formData.get('nome') ?? '');
  const descricao = String(formData.get('descricao') ?? '') || null;
  const membrosIds = formData.getAll('membrosIds').map(String);
  if (!nome) {
    return { error: 'Informe o nome da comissão.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.createCommittee.execute(session.authContext, {
    gestaoId,
    nome,
    descricao,
    membrosIds,
  });
  if (!result.ok) {
    return { error: result.error.message };
  }

  revalidatePath(`/admin/pessoas/gestoes/${gestaoId}`);
  return { error: null };
}

export async function updateCommitteeAction(
  committeeId: string,
  gestaoId: string,
  _prevState: GovernanceActionState,
  formData: FormData,
): Promise<GovernanceActionState> {
  const session = await requireSession();

  const nome = String(formData.get('nome') ?? '');
  const descricao = String(formData.get('descricao') ?? '') || null;
  const membrosIds = formData.getAll('membrosIds').map(String);
  if (!nome) {
    return { error: 'Informe o nome da comissão.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.updateCommittee.execute(
    session.authContext,
    committeeId,
    {
      nome,
      descricao,
      membrosIds,
    },
  );
  if (!result.ok) {
    return { error: result.error.message };
  }

  revalidatePath(`/admin/pessoas/gestoes/${gestaoId}`);
  return { error: null };
}
