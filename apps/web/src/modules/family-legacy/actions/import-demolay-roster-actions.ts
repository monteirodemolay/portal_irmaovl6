'use server';

import { revalidatePath } from 'next/cache';
import { createServerContainer } from '@vl6/infra';
import {
  DEMOLAY_RIO_VERDE_350_ROSTER,
  type CrossReferenceDemolayRosterRow,
  type ImportDemolayChapterRosterRow,
} from '@vl6/domain';
import { normalizeNameForSearch } from '@vl6/shared';
import { requireSession } from '@/lib/auth/require-session';
import { getCurrentTenant } from '@/lib/tenant/get-current-tenant';

const ENTITY_NAME = 'Capítulo Rio Verde n.º 350';

export interface ImportDemolayRosterActionState {
  error: string | null;
  report: ImportDemolayChapterRosterRow[] | null;
  entityId: string | null;
}

const EMPTY_STATE: ImportDemolayRosterActionState = { error: null, report: null, entityId: null };

export interface CrossReferenceDemolayRosterActionState {
  error: string | null;
  report: CrossReferenceDemolayRosterRow[] | null;
}

const EMPTY_CROSS_REFERENCE_STATE: CrossReferenceDemolayRosterActionState = {
  error: null,
  report: null,
};

/**
 * Importação única da nominata do Capítulo DeMolay Rio Verde n.º 350
 * (`DEMOLAY_RIO_VERDE_350_ROSTER`) — encontra a `ParamasonicEntity`
 * correspondente pelo nome (ou cria, se ainda não existir) e importa todos
 * os integrantes como corpo próprio. Idempotente: pode rodar de novo sem
 * duplicar ninguém.
 */
export async function importDemolayRosterAction(
  _prevState: ImportDemolayRosterActionState,
  _formData: FormData,
): Promise<ImportDemolayRosterActionState> {
  const [session, currentTenant] = await Promise.all([requireSession(), getCurrentTenant()]);
  const container = createServerContainer();

  const entities = await container.useCases.listParamasonicEntities.execute(session.authContext);
  const normalizedTarget = normalizeNameForSearch(ENTITY_NAME);
  let entity = entities.find((e) => normalizeNameForSearch(e.name) === normalizedTarget);

  if (!entity) {
    const created = await container.useCases.createParamasonicEntity.execute(session.authContext, {
      kind: 'demolay',
      name: ENTITY_NAME,
      shortName: 'DeMolays',
      unitNumber: '350',
      parentUnitName: currentTenant?.tenant.nome ?? 'Loja Verdadeira Luz nº 06',
      situacao: 'ativa',
      modules: { people: true, agenda: true, content: true, publicPage: false },
    });
    if (!created.ok) return { ...EMPTY_STATE, error: created.error.message };
    entity = created.value;
  }

  const result = await container.useCases.importDemolayChapterRoster.execute(
    session.authContext,
    entity.id,
    DEMOLAY_RIO_VERDE_350_ROSTER,
  );
  if (!result.ok) return { ...EMPTY_STATE, error: result.error.message };

  revalidatePath('/admin/pessoas/paramaconicas');
  revalidatePath(`/admin/pessoas/paramaconicas/${entity.id}`);

  return { error: null, report: result.value, entityId: entity.id };
}

/**
 * Cruza, por nome, os integrantes do Capítulo Rio Verde n.º 350 já
 * importados contra os Irmãos cadastrados na VL6 — quem tem o mesmo nome
 * (ex.: entrou no DeMolay antes de ser iniciado na Maçonaria) é vinculado
 * nos dois cadastros. Precisa rodar `importDemolayRosterAction` antes, pra
 * a entidade já existir.
 */
export async function crossReferenceDemolayRosterAction(
  _prevState: CrossReferenceDemolayRosterActionState,
  _formData: FormData,
): Promise<CrossReferenceDemolayRosterActionState> {
  const session = await requireSession();
  const container = createServerContainer();

  const entities = await container.useCases.listParamasonicEntities.execute(session.authContext);
  const normalizedTarget = normalizeNameForSearch(ENTITY_NAME);
  const entity = entities.find((e) => normalizeNameForSearch(e.name) === normalizedTarget);
  if (!entity) {
    return {
      ...EMPTY_CROSS_REFERENCE_STATE,
      error: 'Importe a nominata primeiro — a entidade ainda não existe.',
    };
  }

  const result = await container.useCases.crossReferenceDemolayRoster.execute(
    session.authContext,
    entity.id,
  );
  if (!result.ok) return { ...EMPTY_CROSS_REFERENCE_STATE, error: result.error.message };

  revalidatePath(`/admin/pessoas/paramaconicas/${entity.id}`);

  return { error: null, report: result.value };
}
