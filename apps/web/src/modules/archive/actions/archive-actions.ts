'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  archiveCollectionSchema,
  archiveRelationSchema,
  archiveExhibitionSchema,
  archiveExhibitionSectionSchema,
  archiveCatalogEntrySchema,
  ARCHIVE_RELATION_NODE_KINDS,
} from '@vl6/shared';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';

export interface ArchiveActionState {
  error: string | null;
}

function parseArchiveCollectionForm(formData: FormData) {
  return archiveCollectionSchema.parse({
    titulo: formData.get('titulo'),
    slug: formData.get('slug'),
    descricaoEditorial: formData.get('descricaoEditorial') || null,
    curadoPor: formData.get('curadoPor') || null,
    capaUrl: formData.get('capaUrl') || null,
    ordem: formData.get('ordem'),
  });
}

export async function createArchiveCollectionAction(
  _prevState: ArchiveActionState,
  formData: FormData,
): Promise<ArchiveActionState> {
  const session = await requireSession();

  let input;
  try {
    input = parseArchiveCollectionForm(formData);
  } catch {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.createArchiveCollection.execute(
    session.authContext,
    input,
  );
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/admin/acervo/colecoes');
  redirect(`/admin/acervo/colecoes/${result.value.id}`);
}

export async function updateArchiveCollectionAction(
  collectionId: string,
  _prevState: ArchiveActionState,
  formData: FormData,
): Promise<ArchiveActionState> {
  const session = await requireSession();

  let input;
  try {
    input = parseArchiveCollectionForm(formData);
  } catch {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios.' };
  }
  const itemIds = formData.getAll('itemIds').map(String);

  const container = createServerContainer();
  const result = await container.useCases.updateArchiveCollection.execute(
    session.authContext,
    collectionId,
    { ...input, itemIds },
  );
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/admin/acervo/colecoes');
  revalidatePath(`/admin/acervo/colecoes/${collectionId}`);
  return { error: null };
}

export async function publishArchiveCollectionAction(
  collectionId: string,
  publicar: boolean,
): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.publishArchiveCollection.execute(
    session.authContext,
    collectionId,
    publicar,
  );
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/admin/acervo/colecoes');
  revalidatePath(`/admin/acervo/colecoes/${collectionId}`);
}

export interface CreateArchiveRelationState {
  error: string | null;
}

function parseRelationNodeValue(
  raw: FormDataEntryValue | null,
): { tipo: (typeof ARCHIVE_RELATION_NODE_KINDS)[number]; id: string } | null {
  if (typeof raw !== 'string') return null;
  const separatorIndex = raw.indexOf('|');
  if (separatorIndex <= 0) return null;

  const tipo = raw.slice(0, separatorIndex);
  const id = raw.slice(separatorIndex + 1);
  if (
    !id ||
    !ARCHIVE_RELATION_NODE_KINDS.includes(tipo as (typeof ARCHIVE_RELATION_NODE_KINDS)[number])
  ) {
    return null;
  }
  return { tipo: tipo as (typeof ARCHIVE_RELATION_NODE_KINDS)[number], id };
}

export async function createArchiveRelationAction(
  _prevState: CreateArchiveRelationState,
  formData: FormData,
): Promise<CreateArchiveRelationState> {
  const session = await requireSession();

  const origem = parseRelationNodeValue(formData.get('origem'));
  const destino = parseRelationNodeValue(formData.get('destino'));
  if (!origem || !destino) {
    return { error: 'Selecione os dois registros a relacionar.' };
  }

  let input;
  try {
    input = archiveRelationSchema.parse({
      origemTipo: origem.tipo,
      origemId: origem.id,
      destinoTipo: destino.tipo,
      destinoId: destino.id,
      tipo: formData.get('tipo'),
      descricao: formData.get('descricao') || null,
    });
  } catch {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.createArchiveRelation.execute(session.authContext, input);
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/admin/acervo/relacoes');
  redirect('/admin/acervo/relacoes');
}

export async function softDeleteArchiveRelationAction(relationId: string): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.softDeleteArchiveRelation.execute(
    session.authContext,
    relationId,
  );
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/admin/acervo/relacoes');
}

function parseArchiveExhibitionForm(formData: FormData) {
  return archiveExhibitionSchema.parse({
    titulo: formData.get('titulo'),
    slug: formData.get('slug'),
    descricaoEditorial: formData.get('descricaoEditorial') || null,
    curadoPor: formData.get('curadoPor') || null,
    capaUrl: formData.get('capaUrl') || null,
    ordem: formData.get('ordem'),
  });
}

export async function createArchiveExhibitionAction(
  _prevState: ArchiveActionState,
  formData: FormData,
): Promise<ArchiveActionState> {
  const session = await requireSession();

  let input;
  try {
    input = parseArchiveExhibitionForm(formData);
  } catch {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.createArchiveExhibition.execute(
    session.authContext,
    input,
  );
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/admin/acervo/exposicoes');
  redirect(`/admin/acervo/exposicoes/${result.value.id}`);
}

export async function updateArchiveExhibitionAction(
  exhibitionId: string,
  _prevState: ArchiveActionState,
  formData: FormData,
): Promise<ArchiveActionState> {
  const session = await requireSession();

  let input;
  try {
    input = parseArchiveExhibitionForm(formData);
  } catch {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios.' };
  }

  let secoes;
  try {
    const raw = formData.get('secoes');
    const parsedJson: unknown = JSON.parse(typeof raw === 'string' ? raw : '[]');
    secoes = archiveExhibitionSectionSchema.array().parse(parsedJson);
  } catch {
    return { error: 'Não foi possível salvar as seções. Tente novamente.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.updateArchiveExhibition.execute(
    session.authContext,
    exhibitionId,
    { ...input, secoes },
  );
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/admin/acervo/exposicoes');
  revalidatePath(`/admin/acervo/exposicoes/${exhibitionId}`);
  return { error: null };
}

export async function publishArchiveExhibitionAction(
  exhibitionId: string,
  publicar: boolean,
): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.publishArchiveExhibition.execute(
    session.authContext,
    exhibitionId,
    publicar,
  );
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/admin/acervo/exposicoes');
  revalidatePath(`/admin/acervo/exposicoes/${exhibitionId}`);
}

function parseTagsField(raw: FormDataEntryValue | null): string[] {
  if (typeof raw !== 'string') return [];
  return raw
    .split(',')
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

function parseArchiveCatalogEntryForm(formData: FormData) {
  return archiveCatalogEntrySchema.parse({
    origemId: formData.get('origemId'),
    tituloCurado: formData.get('tituloCurado') || null,
    contextoHistorico: formData.get('contextoHistorico') || null,
    tags: parseTagsField(formData.get('tags')),
  });
}

export async function createArchiveCatalogEntryAction(
  _prevState: ArchiveActionState,
  formData: FormData,
): Promise<ArchiveActionState> {
  const session = await requireSession();

  let input;
  try {
    input = parseArchiveCatalogEntryForm(formData);
  } catch {
    return { error: 'Dados inválidos. Selecione um item e verifique os campos.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.upsertArchiveCatalogEntry.execute(
    session.authContext,
    input,
  );
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/admin/acervo/catalogacao');
  redirect(`/admin/acervo/catalogacao/${result.value.id}`);
}

export async function updateArchiveCatalogEntryAction(
  entryId: string,
  _prevState: ArchiveActionState,
  formData: FormData,
): Promise<ArchiveActionState> {
  const session = await requireSession();

  let input;
  try {
    input = parseArchiveCatalogEntryForm(formData);
  } catch {
    return { error: 'Dados inválidos. Verifique os campos.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.upsertArchiveCatalogEntry.execute(
    session.authContext,
    input,
  );
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/admin/acervo/catalogacao');
  revalidatePath(`/admin/acervo/catalogacao/${entryId}`);
  return { error: null };
}

export async function publishArchiveCatalogEntryAction(
  entryId: string,
  publicar: boolean,
): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.publishArchiveCatalogEntry.execute(
    session.authContext,
    entryId,
    publicar,
  );
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/admin/acervo/catalogacao');
  revalidatePath(`/admin/acervo/catalogacao/${entryId}`);
}
