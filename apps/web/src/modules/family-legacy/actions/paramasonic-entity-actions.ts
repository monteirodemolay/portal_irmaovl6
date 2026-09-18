'use server';

import { revalidatePath } from 'next/cache';
import {
  PARAMASONIC_ENTITY_KINDS,
  PARAMASONIC_ENTITY_MEMBER_CATEGORIES,
  PARAMASONIC_ENTITY_MEMBER_SITUATIONS,
  PARAMASONIC_ENTITY_STATUSES,
  type FraternalAffiliationKind,
  type ParamasonicEntityMemberCategory,
  type ParamasonicEntityMemberSituation,
  type ParamasonicEntityStatus,
} from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import type { SyncSpousesToParamasonicEntityResult } from '@vl6/domain';
import { requireSession } from '@/lib/auth/require-session';

export interface ParamasonicEntityActionState {
  error: string | null;
}

function readModule(formData: FormData, key: string): boolean {
  return formData.get(key) === 'on';
}

export async function createParamasonicEntityAction(
  _prevState: ParamasonicEntityActionState,
  formData: FormData,
): Promise<ParamasonicEntityActionState> {
  const session = await requireSession();

  const kind = formData.get('kind');
  const situacao = formData.get('situacao');
  if (
    typeof kind !== 'string' ||
    !PARAMASONIC_ENTITY_KINDS.includes(kind as Exclude<FraternalAffiliationKind, 'mason'>) ||
    typeof situacao !== 'string' ||
    !PARAMASONIC_ENTITY_STATUSES.includes(situacao as ParamasonicEntityStatus)
  ) {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.createParamasonicEntity.execute(session.authContext, {
    kind: kind as Exclude<FraternalAffiliationKind, 'mason'>,
    name: String(formData.get('name') ?? ''),
    shortName: String(formData.get('shortName') ?? ''),
    unitNumber: (formData.get('unitNumber') as string) || null,
    parentUnitName: String(formData.get('parentUnitName') ?? ''),
    situacao: situacao as ParamasonicEntityStatus,
    modules: {
      people: readModule(formData, 'moduleIntegrantes'),
      agenda: readModule(formData, 'moduleAgenda'),
      content: readModule(formData, 'moduleContent'),
      publicPage: readModule(formData, 'modulePublicPage'),
    },
  });
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/admin/pessoas/paramaconicas');
  return { error: null };
}

export async function addParamasonicEntityMemberAction(
  entityId: string,
  _prevState: ParamasonicEntityActionState,
  formData: FormData,
): Promise<ParamasonicEntityActionState> {
  const session = await requireSession();

  const situacao = formData.get('situacao');
  if (
    typeof situacao !== 'string' ||
    !PARAMASONIC_ENTITY_MEMBER_SITUATIONS.includes(situacao as ParamasonicEntityMemberSituation)
  ) {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios.' };
  }

  const memberId = (formData.get('memberId') as string) || null;
  const dataIngresso = formData.get('dataIngresso');
  const categoria = (formData.get('categoria') as string) || null;

  const container = createServerContainer();
  const result = await container.useCases.addParamasonicEntityMember.execute(session.authContext, {
    entityId,
    memberId,
    nomeCompleto: memberId ? null : (formData.get('nomeCompleto') as string) || null,
    contato: memberId ? null : (formData.get('contato') as string) || null,
    cargo: (formData.get('cargo') as string) || null,
    categoria: categoria as ParamasonicEntityMemberCategory | null,
    situacao: situacao as ParamasonicEntityMemberSituation,
    dataIngresso: typeof dataIngresso === 'string' && dataIngresso ? new Date(dataIngresso) : null,
  });
  if (!result.ok) return { error: result.error.message };

  revalidatePath(`/admin/pessoas/paramaconicas/${entityId}`);
  return { error: null };
}

export async function updateParamasonicEntityMemberAction(
  entityId: string,
  memberEntryId: string,
  _prevState: ParamasonicEntityActionState,
  formData: FormData,
): Promise<ParamasonicEntityActionState> {
  const session = await requireSession();

  const situacao = formData.get('situacao');
  if (
    typeof situacao !== 'string' ||
    !PARAMASONIC_ENTITY_MEMBER_SITUATIONS.includes(situacao as ParamasonicEntityMemberSituation)
  ) {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios.' };
  }

  const categoria = (formData.get('categoria') as string) || null;
  if (
    categoria &&
    !PARAMASONIC_ENTITY_MEMBER_CATEGORIES.includes(categoria as ParamasonicEntityMemberCategory)
  ) {
    return { error: 'Categoria inválida.' };
  }

  const dataIngresso = formData.get('dataIngresso');

  const container = createServerContainer();
  const result = await container.useCases.updateParamasonicEntityMember.execute(
    session.authContext,
    {
      id: memberEntryId,
      nomeCompleto: (formData.get('nomeCompleto') as string) || null,
      contato: (formData.get('contato') as string) || null,
      cargo: (formData.get('cargo') as string) || null,
      categoria: categoria as ParamasonicEntityMemberCategory | null,
      situacao: situacao as ParamasonicEntityMemberSituation,
      dataIngresso:
        typeof dataIngresso === 'string' && dataIngresso ? new Date(dataIngresso) : null,
      marcarComoExDemolay: formData.get('marcarComoExDemolay') === 'on',
      marcarComoPastPresidenteConselho: formData.get('marcarComoPastPresidenteConselho') === 'on',
    },
  );
  if (!result.ok) return { error: result.error.message };

  revalidatePath(`/admin/pessoas/paramaconicas/${entityId}`);
  return { error: null };
}

export async function removeParamasonicEntityMemberAction(
  entityId: string,
  memberEntryId: string,
): Promise<void> {
  const session = await requireSession();

  const container = createServerContainer();
  await container.useCases.removeParamasonicEntityMember.execute(
    session.authContext,
    memberEntryId,
  );

  revalidatePath(`/admin/pessoas/paramaconicas/${entityId}`);
}

export async function createParamasonicEntityPositionAction(
  entityId: string,
  _prevState: ParamasonicEntityActionState,
  formData: FormData,
): Promise<ParamasonicEntityActionState> {
  const session = await requireSession();

  const nome = (formData.get('nome') as string) || '';

  const container = createServerContainer();
  const result = await container.useCases.createParamasonicEntityPosition.execute(
    session.authContext,
    entityId,
    nome,
  );
  if (!result.ok) return { error: result.error.message };

  revalidatePath(`/admin/pessoas/paramaconicas/${entityId}`);
  return { error: null };
}

export async function removeParamasonicEntityPositionAction(
  entityId: string,
  positionId: string,
): Promise<void> {
  const session = await requireSession();

  const container = createServerContainer();
  await container.useCases.removeParamasonicEntityPosition.execute(session.authContext, positionId);

  revalidatePath(`/admin/pessoas/paramaconicas/${entityId}`);
}

export interface SyncSpousesToParamasonicEntityState {
  error: string | null;
  result: SyncSpousesToParamasonicEntityResult | null;
}

/**
 * Sincroniza o cônjuge cadastrado no Member (`conjugeNome`, preenchido no
 * cadastro/importação do Irmão) como Integrante do corpo próprio da
 * Fraternidade Feminina — só disponível pra entidades desse tipo (o use
 * case rejeita qualquer outra). Seguro rodar mais de uma vez.
 */
export async function syncSpousesToParamasonicEntityAction(
  entityId: string,
): Promise<SyncSpousesToParamasonicEntityState> {
  const session = await requireSession();
  const container = createServerContainer();

  const result = await container.useCases.syncSpousesToParamasonicEntity.execute(
    session.authContext,
    entityId,
  );
  if (!result.ok) return { error: result.error.message, result: null };

  revalidatePath(`/admin/pessoas/paramaconicas/${entityId}`);
  return { error: null, result: result.value };
}
