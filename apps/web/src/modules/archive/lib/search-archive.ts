import 'server-only';
import type { AuthContext } from '@vl6/domain';
import { hasPermission } from '@vl6/domain';
import type { ServerContainer } from '@vl6/infra';
import { archiveItemHref, buildArchiveItemId } from './archive-item-id';
import type { ArchiveSearchResult } from './archive-search-match';

export {
  ARCHIVE_SEARCH_KINDS,
  ARCHIVE_SEARCH_KIND_LABELS,
  matchesArchiveSearch,
  normalizeSearchText,
  type ArchiveSearchKind,
  type ArchiveSearchResult,
} from './archive-search-match';

/**
 * Busca federada do Acervo VL6 — documentos publicados, itens da Biblioteca
 * e álbuns da Galeria, sem indexador paralelo (doc 11.3), respeitando as
 * permissões da sessão. Compartilhada entre `/acervo` (prévia, até 12
 * resultados) e `/acervo/pesquisar` (lista completa) para não duplicar a
 * lógica de agregação — ver `docs/architecture/11-acervo-vl6.md`.
 */
export async function loadArchiveSearchResults(
  authContext: AuthContext,
  container: ServerContainer,
): Promise<ArchiveSearchResult[]> {
  const canReadFiles = hasPermission(authContext, 'file:read');
  const canReadLibrary = hasPermission(authContext, 'libraryItem:read');
  const canReadGallery = hasPermission(authContext, 'gallery:read');
  const canReadCatalog = hasPermission(authContext, 'archiveCatalog:read');

  const [filesPage, libraryItems, albums, catalogEntries] = await Promise.all([
    canReadFiles || canReadLibrary
      ? container.useCases.listAllFileAssets.execute(authContext, { limit: 200 })
      : Promise.resolve({ items: [], nextCursor: null, hasMore: false }),
    canReadLibrary
      ? container.repositories.libraryItem.listByTenant(authContext.tenantId)
      : Promise.resolve([]),
    canReadGallery ? container.useCases.listGalleryAlbums.execute(authContext) : Promise.resolve([]),
    canReadCatalog
      ? container.repositories.archiveCatalogEntry.listByTenant(authContext.tenantId)
      : Promise.resolve([]),
  ]);

  // Só fichas publicadas entram na busca — rascunho não deve vazar conteúdo
  // ainda em revisão, mesma regra do painel "Contexto Histórico".
  const catalogTextByOrigemId = new Map(
    catalogEntries
      .filter((entry) => entry.publicado)
      .map((entry) => [
        entry.origemId,
        [entry.tituloCurado, entry.contextoHistorico, ...entry.tags].filter(Boolean).join(' '),
      ]),
  );

  const fileById = new Map(filesPage.items.map((file) => [file.id, file]));
  const libraryFileIds = new Set(libraryItems.map((item) => item.fileId));

  const documentResults: ArchiveSearchResult[] = filesPage.items
    .filter((file) => file.publicado && !libraryFileIds.has(file.id))
    .map((file) => ({
      id: file.id,
      kind: 'documento',
      title: file.titulo,
      description: file.descricao || 'Documento institucional do Acervo VL6.',
      href: archiveItemHref('file', file.id),
      createdAt: file.createdAt,
      catalogText: catalogTextByOrigemId.get(buildArchiveItemId('file', file.id)) ?? null,
    }));

  const libraryResults: ArchiveSearchResult[] = libraryItems.flatMap((item) => {
    const file = fileById.get(item.fileId);
    if (!file) return [];
    return [
      {
        id: item.id,
        kind: 'biblioteca' as const,
        title: file.titulo,
        description: file.descricao || 'Estudo e leitura selecionada para os Irmãos.',
        href: archiveItemHref('library', item.id),
        createdAt: item.createdAt,
        catalogText: catalogTextByOrigemId.get(buildArchiveItemId('library', item.id)) ?? null,
      },
    ];
  });

  const galleryResults: ArchiveSearchResult[] = albums.map((album) => ({
    id: album.id,
    kind: 'fotografia',
    title: album.titulo,
    description: `${album.categoria} · registro da Loja`,
    href: archiveItemHref('gallery-album', album.id),
    createdAt: album.createdAt,
    catalogText: catalogTextByOrigemId.get(buildArchiveItemId('gallery-album', album.id)) ?? null,
  }));

  return [...documentResults, ...libraryResults, ...galleryResults];
}
