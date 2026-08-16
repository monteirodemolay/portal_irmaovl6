'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { archiveCollectionSchema } from '@vl6/shared';
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
