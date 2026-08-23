'use server';

import { revalidatePath } from 'next/cache';
import { FILE_KIND_LABELS } from '@vl6/shared';
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

export interface FileMigrationCandidateView {
  fileId: string;
  titulo: string;
  categoriaNome: string;
  tipoLabel: string;
  tamanhoBytes: number;
}

/**
 * `FileAsset`s (Arquivos legado) ainda sem `ArchiveItem` correspondente —
 * Fase C "Administração & métricas", mesmo critério de idempotência de
 * `loadMigrationCandidatesAction` (Fase 5), agora olhando
 * `origemFileAssetId` em vez de `origemGalleryAlbumId`.
 */
export async function loadFileMigrationCandidatesAction(): Promise<FileMigrationCandidateView[]> {
  const session = await requireSession();
  const container = createServerContainer();

  const [filesPage, itemsPage, categories] = await Promise.all([
    container.repositories.fileAsset.listAll(session.authContext.tenantId, { limit: 500 }),
    container.repositories.archiveItem.findByTenant(session.authContext.tenantId, { limit: 500 }),
    container.repositories.fileCategory.listByTenant(session.authContext.tenantId),
  ]);

  const migratedFileIds = new Set(
    itemsPage.items.map((item) => item.origemFileAssetId).filter((id): id is string => Boolean(id)),
  );
  const categoriaNomeById = new Map(categories.map((category) => [category.id, category.nome]));

  return filesPage.items
    .filter((file) => !migratedFileIds.has(file.id))
    .map((file) => ({
      fileId: file.id,
      titulo: file.titulo,
      categoriaNome: categoriaNomeById.get(file.categoriaId) ?? '—',
      tipoLabel: FILE_KIND_LABELS[file.tipo],
      tamanhoBytes: file.tamanhoBytes,
    }));
}

export interface MigrateFileAssetActionState {
  ok: boolean;
  error: string | null;
  archiveItemId: string | null;
}

/**
 * Migra UM `FileAsset`, após confirmação explícita — nunca em lote. O
 * `FileAsset` de origem nunca é alterado.
 */
export async function migrateFileAssetAction(
  fileId: string,
  eventId: string,
): Promise<MigrateFileAssetActionState> {
  const session = await requireSession();
  const container = createServerContainer();

  const result = await container.useCases.migrateFileAsset.execute(session.authContext, {
    fileId,
    eventId,
  });
  if (!result.ok) {
    return { ok: false, error: result.error.message, archiveItemId: null };
  }

  revalidatePath(MIGRATION_PATH);
  revalidatePath(PUBLISH_HUB_PATH);
  return { ok: true, error: null, archiveItemId: result.value.id };
}

export interface LibraryMigrationCandidateView {
  libraryItemId: string;
  titulo: string;
  categoriaNome: string;
  tipoLabel: string;
  tamanhoBytes: number;
}

/**
 * `LibraryItem`s (Biblioteca legada) ainda sem `ArchiveItem`
 * correspondente — Fase C, mesmo critério de idempotência olhando
 * `origemLibraryItemId`. `titulo`/`tipo`/`tamanhoBytes` vêm do `FileAsset`
 * associado (`LibraryItem` não tem esses campos próprios — é só a camada
 * de curadoria sobre o arquivo).
 */
export async function loadLibraryMigrationCandidatesAction(): Promise<
  LibraryMigrationCandidateView[]
> {
  const session = await requireSession();
  const container = createServerContainer();

  const [libraryItems, itemsPage, categories] = await Promise.all([
    container.repositories.libraryItem.listByTenant(session.authContext.tenantId),
    container.repositories.archiveItem.findByTenant(session.authContext.tenantId, { limit: 500 }),
    container.repositories.libraryCategory.listByTenant(session.authContext.tenantId),
  ]);

  const migratedLibraryItemIds = new Set(
    itemsPage.items
      .map((item) => item.origemLibraryItemId)
      .filter((id): id is string => Boolean(id)),
  );
  const categoriaNomeById = new Map(categories.map((category) => [category.id, category.nome]));

  const pendingItems = libraryItems.filter((item) => !migratedLibraryItemIds.has(item.id));
  const files = await Promise.all(
    pendingItems.map((item) => container.repositories.fileAsset.findById(item.fileId)),
  );

  return pendingItems.flatMap((item, index) => {
    const file = files[index];
    if (!file) return [];
    return [
      {
        libraryItemId: item.id,
        titulo: file.titulo,
        categoriaNome: categoriaNomeById.get(item.categoriaId) ?? '—',
        tipoLabel: FILE_KIND_LABELS[file.tipo],
        tamanhoBytes: file.tamanhoBytes,
      },
    ];
  });
}

export interface MigrateLibraryItemActionState {
  ok: boolean;
  error: string | null;
  archiveItemId: string | null;
}

/**
 * Migra UM `LibraryItem`, após confirmação explícita — nunca em lote. O
 * `LibraryItem`/`FileAsset` de origem nunca são alterados.
 */
export async function migrateLibraryItemAction(
  libraryItemId: string,
  eventId: string,
): Promise<MigrateLibraryItemActionState> {
  const session = await requireSession();
  const container = createServerContainer();

  const result = await container.useCases.migrateLibraryItem.execute(session.authContext, {
    libraryItemId,
    eventId,
  });
  if (!result.ok) {
    return { ok: false, error: result.error.message, archiveItemId: null };
  }

  revalidatePath(MIGRATION_PATH);
  revalidatePath(PUBLISH_HUB_PATH);
  return { ok: true, error: null, archiveItemId: result.value.id };
}
