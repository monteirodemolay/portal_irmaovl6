'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { fileAssetSchema, fileCategorySchema } from '@vl6/shared';
import { createServerContainer, FirebaseStorageAdapter } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';

export interface DocumentManagementActionState {
  error: string | null;
}

export async function createFileCategoryAction(
  _prevState: DocumentManagementActionState,
  formData: FormData,
): Promise<DocumentManagementActionState> {
  const session = await requireSession();

  let input;
  try {
    input = fileCategorySchema.parse({
      nome: formData.get('nome'),
      acervo: formData.get('acervo') || null,
      ordem: formData.get('ordem') || 0,
    });
  } catch {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.createFileCategory.execute(session.authContext, input);
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/admin/arquivos');
  return { error: null };
}

export async function createFileAssetAction(
  _prevState: DocumentManagementActionState,
  formData: FormData,
): Promise<DocumentManagementActionState> {
  const session = await requireSession();

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Selecione um arquivo para enviar.' };
  }

  let fields;
  try {
    fields = fileAssetSchema.omit({ urlArquivo: true, tamanhoBytes: true }).parse({
      titulo: formData.get('titulo'),
      descricao: formData.get('descricao') || null,
      categoriaId: formData.get('categoriaId'),
      acervo: formData.get('acervo') || null,
      autor: formData.get('autor') || null,
      tipo: formData.get('tipo'),
      urlMiniatura: formData.get('urlMiniatura') || null,
      permitirDownload: formData.get('permitirDownload') === 'on',
      ordem: formData.get('ordem') || 0,
    });
  } catch {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios.' };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storage = new FirebaseStorageAdapter();
  const path = `tenants/${session.authContext.tenantId}/files/${randomUUID()}-${file.name}`;
  const upload = await storage.upload({
    path,
    buffer,
    contentType: file.type || 'application/octet-stream',
  });

  const container = createServerContainer();
  const result = await container.useCases.createFileAsset.execute(session.authContext, {
    ...fields,
    urlArquivo: upload.url,
    tamanhoBytes: upload.sizeBytes,
  });
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/admin/arquivos');
  redirect('/admin/arquivos');
}

export async function toggleFileAssetPublishedAction(
  fileId: string,
  publicar: boolean,
): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.publishFileAsset.execute(
    session.authContext,
    fileId,
    publicar,
  );
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/admin/arquivos');
}

export async function softDeleteFileAssetAction(fileId: string): Promise<void> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.softDeleteFileAsset.execute(session.authContext, fileId);
  if (!result.ok) throw new Error(result.error.message);

  revalidatePath('/admin/arquivos');
}
