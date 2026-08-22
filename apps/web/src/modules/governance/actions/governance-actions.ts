'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';
import { CUSTOM_CARGO_VALUE } from '../lib/cargo-constants';

export interface GovernanceActionState {
  error: string | null;
}

export async function createBoardTermAction(
  _prevState: GovernanceActionState,
  formData: FormData,
): Promise<GovernanceActionState> {
  const session = await requireSession();

  const nome = String(formData.get('nome') ?? '');
  const periodoInicio = new Date(String(formData.get('periodoInicio')));
  const periodoFim = new Date(String(formData.get('periodoFim')));
  if (!nome || Number.isNaN(periodoInicio.getTime()) || Number.isNaN(periodoFim.getTime())) {
    return { error: 'Preencha nome e as duas datas do período.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.createBoardTerm.execute(session.authContext, {
    nome,
    periodoInicio,
    periodoFim,
  });
  if (!result.ok) {
    return { error: result.error.message };
  }

  revalidatePath('/admin/pessoas/gestoes');
  redirect(`/admin/pessoas/gestoes/${result.value.id}`);
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
