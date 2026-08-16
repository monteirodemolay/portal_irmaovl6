import 'server-only';
import type { AuthContext } from '@vl6/domain';
import { hasPermission } from '@vl6/domain';
import type { ServerContainer } from '@vl6/infra';
import { FILE_KIND_LABELS, GALLERY_MEDIA_KIND_LABELS } from '@vl6/shared';
import { buildArchiveItemId, parseArchiveItemId, type ArchiveItemKind } from './archive-item-id';

export interface ResolvedArchiveItem {
  compositeId: string;
  kind: ArchiveItemKind;
  kindLabel: string;
  titulo: string;
  descricao: string | null;
  autor: string | null;
  categoriaNome: string | null;
  tipoDetalhado: string | null;
  thumbnailUrl: string | null;
  viewHref: string;
  downloadHref: string | null;
  tamanhoBytes: number | null;
  dataReferencia: Date | null;
  catalogadoEm: Date;
  legacyHref: string;
  legacyLabel: string;
}

const KIND_LABELS: Record<ArchiveItemKind, string> = {
  file: 'Documento',
  library: 'Biblioteca',
  'gallery-album': 'Álbum de Fotos e Vídeos',
  'gallery-media': 'Foto/Vídeo',
};

async function resolveFile(
  container: ServerContainer,
  authContext: AuthContext,
  sourceId: string,
): Promise<ResolvedArchiveItem | null> {
  if (!hasPermission(authContext, 'file:read')) return null;

  const file = await container.repositories.fileAsset.findById(sourceId);
  if (
    !file ||
    file.tenantId !== authContext.tenantId ||
    file.deletedAt ||
    !file.ativo ||
    !file.publicado
  ) {
    return null;
  }

  const category = await container.repositories.fileCategory.findById(file.categoriaId);

  return {
    compositeId: buildArchiveItemId('file', file.id),
    kind: 'file',
    kindLabel: KIND_LABELS.file,
    titulo: file.titulo,
    descricao: file.descricao,
    autor: file.autor,
    categoriaNome: category?.nome ?? null,
    tipoDetalhado: FILE_KIND_LABELS[file.tipo],
    thumbnailUrl: file.urlMiniatura,
    viewHref: `/api/files/${file.id}`,
    downloadHref: file.permitirDownload ? `/api/files/${file.id}?mode=download` : null,
    tamanhoBytes: file.tamanhoBytes,
    dataReferencia: file.dataPublicacao,
    catalogadoEm: file.createdAt,
    legacyHref: '/arquivos',
    legacyLabel: 'Ver em Documentos',
  };
}

async function resolveLibraryItem(
  container: ServerContainer,
  authContext: AuthContext,
  sourceId: string,
): Promise<ResolvedArchiveItem | null> {
  if (!hasPermission(authContext, 'libraryItem:read')) return null;

  const item = await container.repositories.libraryItem.findById(sourceId);
  if (!item || item.tenantId !== authContext.tenantId || item.deletedAt || !item.ativo) {
    return null;
  }

  const file = await container.repositories.fileAsset.findById(item.fileId);
  if (
    !file ||
    file.tenantId !== authContext.tenantId ||
    file.deletedAt ||
    !file.ativo ||
    !file.publicado
  ) {
    return null;
  }

  const category = await container.repositories.libraryCategory.findById(item.categoriaId);

  return {
    compositeId: buildArchiveItemId('library', item.id),
    kind: 'library',
    kindLabel: KIND_LABELS.library,
    titulo: file.titulo,
    descricao: file.descricao,
    autor: file.autor,
    categoriaNome: category?.nome ?? null,
    tipoDetalhado: FILE_KIND_LABELS[file.tipo],
    thumbnailUrl: file.urlMiniatura,
    viewHref: `/api/library-items/${item.id}`,
    downloadHref: file.permitirDownload ? `/api/library-items/${item.id}?mode=download` : null,
    tamanhoBytes: file.tamanhoBytes,
    dataReferencia: file.dataPublicacao,
    catalogadoEm: item.createdAt,
    legacyHref: '/biblioteca',
    legacyLabel: 'Ver na Biblioteca',
  };
}

async function resolveGalleryAlbum(
  container: ServerContainer,
  authContext: AuthContext,
  sourceId: string,
): Promise<ResolvedArchiveItem | null> {
  if (!hasPermission(authContext, 'gallery:read')) return null;

  const album = await container.repositories.galleryAlbum.findById(sourceId);
  if (!album || album.tenantId !== authContext.tenantId || album.deletedAt || !album.ativo) {
    return null;
  }

  return {
    compositeId: buildArchiveItemId('gallery-album', album.id),
    kind: 'gallery-album',
    kindLabel: KIND_LABELS['gallery-album'],
    titulo: album.titulo,
    descricao: null,
    autor: null,
    categoriaNome: album.categoria,
    tipoDetalhado: null,
    thumbnailUrl: album.capaUrl,
    viewHref: `/galeria/${album.id}`,
    downloadHref: null,
    tamanhoBytes: null,
    dataReferencia: album.dataEvento,
    catalogadoEm: album.createdAt,
    legacyHref: `/galeria/${album.id}`,
    legacyLabel: 'Ver na Galeria',
  };
}

async function resolveGalleryMedia(
  container: ServerContainer,
  authContext: AuthContext,
  sourceId: string,
): Promise<ResolvedArchiveItem | null> {
  if (!hasPermission(authContext, 'gallery:read')) return null;

  const media = await container.repositories.galleryMedia.findById(sourceId);
  if (!media || media.tenantId !== authContext.tenantId || media.deletedAt || !media.ativo) {
    return null;
  }

  const album = await container.repositories.galleryAlbum.findById(media.albumId);
  if (!album || album.tenantId !== authContext.tenantId) return null;

  return {
    compositeId: buildArchiveItemId('gallery-media', media.id),
    kind: 'gallery-media',
    kindLabel: KIND_LABELS['gallery-media'],
    titulo: album.titulo,
    descricao: `${album.categoria} · registro da Loja`,
    autor: null,
    categoriaNome: album.categoria,
    tipoDetalhado: GALLERY_MEDIA_KIND_LABELS[media.tipo],
    thumbnailUrl: media.urlMiniatura,
    viewHref: `/api/gallery-media/${media.id}`,
    downloadHref: null,
    tamanhoBytes: null,
    dataReferencia: album.dataEvento,
    catalogadoEm: media.createdAt,
    legacyHref: `/galeria/${album.id}`,
    legacyLabel: 'Ver na Galeria',
  };
}

/**
 * Resolve o "Item do Acervo" canônico a partir de um ID composto
 * (`kind:sourceId`) sem duplicar nenhum registro de origem — ver
 * `archive-item-id.ts`. Retorna `null` tanto para ID inválido quanto para
 * item inexistente/sem permissão/de outro tenant, deliberadamente sem
 * distinguir os casos (mesma cautela de privacidade já usada em
 * `GetPublicMemberProfileUseCase`).
 */
export async function resolveArchiveItem(
  compositeId: string,
  authContext: AuthContext,
  container: ServerContainer,
): Promise<ResolvedArchiveItem | null> {
  const parsed = parseArchiveItemId(compositeId);
  if (!parsed) return null;

  switch (parsed.kind) {
    case 'file':
      return resolveFile(container, authContext, parsed.sourceId);
    case 'library':
      return resolveLibraryItem(container, authContext, parsed.sourceId);
    case 'gallery-album':
      return resolveGalleryAlbum(container, authContext, parsed.sourceId);
    case 'gallery-media':
      return resolveGalleryMedia(container, authContext, parsed.sourceId);
  }
}
