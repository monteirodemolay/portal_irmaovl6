'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import * as Sentry from '@sentry/nextjs';
import { errorToLogContext, galleryAlbumSchema, logger } from '@vl6/shared';
import { createServerContainer, VercelBlobStorageAdapter } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';

export interface GalleryActionState {
  error: string | null;
}

/** Remove caracteres fora de [a-zA-Z0-9._-] do nome original antes de compor o path no storage. */
function sanitizeFileName(name: string): string {
  const safe = name.replace(/[^a-zA-Z0-9._-]/g, '-');
  return safe.slice(-150) || 'arquivo';
}

export async function createGalleryAlbumAction(
  _prevState: GalleryActionState,
  formData: FormData,
): Promise<GalleryActionState> {
  const session = await requireSession();

  let input;
  try {
    input = galleryAlbumSchema.parse({
      titulo: formData.get('titulo'),
      categoria: formData.get('categoria'),
      capaUrl: formData.get('capaUrl') || null,
      dataEvento: formData.get('dataEvento'),
    });
  } catch {
    return { error: 'Dados inválidos. Verifique os campos obrigatórios.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.createGalleryAlbum.execute(session.authContext, input);
  if (!result.ok) return { error: result.error.message };

  revalidatePath('/admin/acervo/galeria');
  redirect(`/admin/acervo/galeria/${result.value.id}`);
}

export async function addGalleryMediaAction(
  albumId: string,
  _prevState: GalleryActionState,
  formData: FormData,
): Promise<GalleryActionState> {
  const session = await requireSession();

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Selecione uma foto ou vídeo para enviar.' };
  }
  const tipo = String(formData.get('tipo') ?? '');
  if (tipo !== 'foto' && tipo !== 'video') {
    return { error: 'Selecione o tipo da mídia.' };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const storage = new VercelBlobStorageAdapter();
  const path = `tenants/${session.authContext.tenantId}/gallery/${randomUUID()}-${sanitizeFileName(file.name)}`;

  let upload;
  try {
    upload = await storage.upload({
      path,
      buffer,
      contentType: file.type || 'application/octet-stream',
    });
  } catch (error) {
    logger.error('Falha ao enviar mídia para o storage', {
      route: 'addGalleryMediaAction',
      ...errorToLogContext(error),
    });
    Sentry.captureException(error, { tags: { route: 'addGalleryMediaAction' } });
    return { error: 'Não foi possível enviar o arquivo. Tente novamente em instantes.' };
  }

  const container = createServerContainer();
  const result = await container.useCases.addGalleryMedia.execute(session.authContext, {
    albumId,
    tipo,
    url: upload.url,
    urlMiniatura: null,
    ordem: Number(formData.get('ordem') ?? 0),
  });
  if (!result.ok) {
    try {
      await storage.delete(path);
    } catch (error) {
      logger.error('Falha ao reverter upload órfão após erro no banco', {
        route: 'addGalleryMediaAction',
        path,
        ...errorToLogContext(error),
      });
      Sentry.captureException(error, { tags: { route: 'addGalleryMediaAction:rollback' } });
    }
    return { error: result.error.message };
  }

  revalidatePath(`/admin/acervo/galeria/${albumId}`);
  return { error: null };
}
