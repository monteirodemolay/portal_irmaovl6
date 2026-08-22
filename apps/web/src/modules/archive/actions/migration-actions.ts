'use server';

import { revalidatePath } from 'next/cache';
import { createServerContainer } from '@vl6/infra';
import { requireSession } from '@/lib/auth/require-session';

const MIGRATION_PATH = '/admin/acervo/migracao';
const PUBLISH_HUB_PATH = '/admin/acervo/publicar';

export interface MigrationCandidateView {
  albumId: string;
  titulo: string;
  categoria: string;
  dataEvento: string;
  mediaCount: number;
}

/**
 * Álbuns da Galeria legada (`GalleryAlbum`) ainda sem `ArchiveItem`
 * correspondente — Fase 5, migração assistida (docs/architecture/
 * 11-acervo-vl6.md §11.6e). Critério de "já migrado": existe um
 * `ArchiveItem` não excluído do tenant com `origemGalleryAlbumId` igual
 * ao álbum (marcador criado por `MigrateGalleryAlbumUseCase`, nunca um
 * campo no próprio `GalleryAlbum` — a Regra de Preservação exige nunca
 * tocar o registro de origem).
 */
export async function loadMigrationCandidatesAction(): Promise<MigrationCandidateView[]> {
  const session = await requireSession();
  const container = createServerContainer();

  const [albums, itemsPage] = await Promise.all([
    container.repositories.galleryAlbum.listByTenant(session.authContext.tenantId),
    container.repositories.archiveItem.findByTenant(session.authContext.tenantId, { limit: 500 }),
  ]);

  const migratedAlbumIds = new Set(
    itemsPage.items
      .map((item) => item.origemGalleryAlbumId)
      .filter((id): id is string => Boolean(id)),
  );

  const pendingAlbums = albums.filter((album) => !migratedAlbumIds.has(album.id));

  const mediaCounts = await Promise.all(
    pendingAlbums.map((album) => container.repositories.galleryMedia.listByAlbum(album.id)),
  );

  return pendingAlbums.map((album, index) => ({
    albumId: album.id,
    titulo: album.titulo,
    categoria: album.categoria,
    dataEvento: album.dataEvento.toISOString(),
    mediaCount: mediaCounts[index]?.filter((media) => !media.deletedAt).length ?? 0,
  }));
}

export interface MigrateGalleryAlbumActionState {
  ok: boolean;
  error: string | null;
  archiveItemId: string | null;
}

/**
 * Migra UM álbum, após confirmação explícita do Administrador na tela —
 * nunca em lote/automático (regra de negócio explícita do projeto). O
 * `GalleryAlbum`/`GalleryMedia` de origem nunca é alterado.
 */
export async function migrateGalleryAlbumAction(
  albumId: string,
  eventId: string,
): Promise<MigrateGalleryAlbumActionState> {
  const session = await requireSession();
  const container = createServerContainer();

  const result = await container.useCases.migrateGalleryAlbum.execute(session.authContext, {
    albumId,
    eventId,
  });
  if (!result.ok) {
    return { ok: false, error: result.error.message, archiveItemId: null };
  }

  revalidatePath(MIGRATION_PATH);
  revalidatePath(PUBLISH_HUB_PATH);
  return { ok: true, error: null, archiveItemId: result.value.id };
}
