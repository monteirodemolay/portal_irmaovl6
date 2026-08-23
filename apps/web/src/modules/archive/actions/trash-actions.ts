'use server';

import { revalidatePath } from 'next/cache';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';

const TRASH_PATH = '/admin/acervo/lixeira';

export interface TrashItemView {
  id: string;
  titulo: string;
  deletedAt: string | null;
}

export interface TrashMediaView {
  id: string;
  originalName: string;
  deletedAt: string | null;
}

export interface TrashListing {
  items: TrashItemView[];
  medias: TrashMediaView[];
}

/**
 * Lixeira administrativa mínima (Fase 3, docs/architecture/11-acervo-vl6.md
 * §11.6) — lista `ArchiveItem`/`ArchiveMedia` soft-deletados do tenant.
 * Sem paginação sofisticada nem expurgo definitivo nesta fase, só listar +
 * restaurar (100 mais recentes de cada, suficiente para o volume esperado
 * enquanto o Acervo é novo).
 */
export async function loadTrashAction(): Promise<TrashListing> {
  const session = await requireSession();
  const container = createServerContainer();

  const [itemsPage, mediaPage] = await Promise.all([
    container.repositories.archiveItem.findDeletedByTenant(session.authContext.tenantId, {
      limit: 100,
    }),
    container.repositories.archiveMedia.findDeletedByTenant(session.authContext.tenantId, {
      limit: 100,
    }),
  ]);

  const mediaAssets = await Promise.all(
    mediaPage.items.map((media) => container.repositories.mediaAsset.findById(media.mediaAssetId)),
  );

  return {
    items: itemsPage.items.map((item) => ({
      id: item.id,
      titulo: item.titulo,
      deletedAt: item.deletedAt ? item.deletedAt.toISOString() : null,
    })),
    medias: mediaPage.items.map((media, index) => ({
      id: media.id,
      originalName: mediaAssets[index]?.originalName ?? 'arquivo',
      deletedAt: media.deletedAt ? media.deletedAt.toISOString() : null,
    })),
  };
}

export interface TrashActionState {
  ok: boolean;
  error: string | null;
}

export async function restoreArchiveItemFromTrashAction(
  archiveItemId: string,
): Promise<TrashActionState> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.restoreArchiveItem.execute(
    session.authContext,
    archiveItemId,
  );
  if (!result.ok) return { ok: false, error: result.error.message };

  revalidatePath(TRASH_PATH);
  return { ok: true, error: null };
}

export async function restoreArchiveMediaFromTrashAction(
  archiveMediaId: string,
): Promise<TrashActionState> {
  const session = await requireSession();
  const container = createServerContainer();
  const result = await container.useCases.restoreArchiveMedia.execute(
    session.authContext,
    archiveMediaId,
  );
  if (!result.ok) return { ok: false, error: result.error.message };

  revalidatePath(TRASH_PATH);
  return { ok: true, error: null };
}
