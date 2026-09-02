'use server';

import { revalidatePath } from 'next/cache';
import type {
  ConstellationView,
  ConstellationViewFilters,
  ConstellationViewRevision,
  ConstellationViewVisibility,
} from '@vl6/domain';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';

export interface ConstellationViewInput {
  nome: string;
  descricao: string | null;
  centerNodeKey: string | null;
  filters: ConstellationViewFilters;
  pinnedNodeKeys: string[];
  hiddenNodeKeys: string[];
  visibility: ConstellationViewVisibility;
}

/** `viewId: null` cria um quadro novo; caso contrário atualiza (só o dono pode) e incrementa a versão. */
export async function saveConstellationViewAction(
  viewId: string | null,
  input: ConstellationViewInput,
): Promise<ConstellationView> {
  const session = await requireSession();
  const container = createServerContainer();

  const result = viewId
    ? await container.useCases.updateConstellationView.execute(session.authContext, viewId, input)
    : await container.useCases.createConstellationView.execute(session.authContext, input);
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/acervo/constelacao');
  return result.value;
}

export async function listMyConstellationViewsAction(): Promise<ConstellationView[]> {
  const session = await requireSession();
  const container = createServerContainer();
  return container.useCases.listMyConstellationViews.execute(session.authContext);
}

export async function getConstellationViewAction(viewId: string): Promise<ConstellationView> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.getConstellationView.execute(session.authContext, viewId);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

export async function deleteConstellationViewAction(viewId: string): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.deleteConstellationView.execute(
    session.authContext,
    viewId,
  );
  if (!result.ok) throw new Error(result.error.message);
  revalidatePath('/acervo/constelacao');
}

export async function listConstellationViewRevisionsAction(
  viewId: string,
): Promise<ConstellationViewRevision[]> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.listConstellationViewRevisions.execute(
    session.authContext,
    viewId,
  );
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

export async function restoreConstellationViewRevisionAction(
  viewId: string,
  revisionId: string,
): Promise<ConstellationView> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.restoreConstellationViewRevision.execute(
    session.authContext,
    viewId,
    revisionId,
  );
  if (!result.ok) throw new Error(result.error.message);
  revalidatePath('/acervo/constelacao');
  return result.value;
}
