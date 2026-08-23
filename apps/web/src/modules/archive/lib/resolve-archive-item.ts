import 'server-only';
import type { AuthContext, Role } from '@vl6/domain';
import { hasPermission } from '@vl6/domain';
import type { ServerContainer } from '@vl6/infra';
import { ARCHIVE_ITEM_TYPE_LABELS, FILE_KIND_LABELS, GALLERY_MEDIA_KIND_LABELS } from '@vl6/shared';
import { isAccessLevelVisible } from './access-level-visibility';
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
  catalogo: ResolvedArchiveItemCatalogo | null;
}

export interface ResolvedArchiveItemCatalogo {
  tituloCurado: string | null;
  contextoHistorico: string | null;
  tags: string[];
}

const KIND_LABELS: Record<ArchiveItemKind, string> = {
  file: 'Documento',
  library: 'Biblioteca',
  'gallery-album': 'Álbum de Fotos e Vídeos',
  'gallery-media': 'Foto/Vídeo',
  'archive-item': 'Evento do Acervo',
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
    catalogo: null,
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
    catalogo: null,
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
    catalogo: null,
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
    catalogo: null,
  };
}

/**
 * Resolve um `ArchiveItem` do Acervo novo (Fases 1-B da Fundação) pelo
 * kind composto `archive-item` (Fase D) — só itens já publicados e visíveis
 * ao nível de acesso da sessão (`isAccessLevelVisible`, mesma regra de
 * `loadEventAlbum`, nunca duplicada aqui). `viewHref`/`legacyHref` apontam
 * para o álbum público real do evento (`/acervo/eventos/[eventId]`), já que
 * um `ArchiveItem` reúne várias mídias — não há um único binário para abrir
 * como nos 4 kinds legados.
 */
async function resolveNewArchiveItem(
  container: ServerContainer,
  authContext: AuthContext,
  role: Role | null,
  sourceId: string,
): Promise<ResolvedArchiveItem | null> {
  if (!hasPermission(authContext, 'archiveItem:read')) return null;

  const visibility = { authenticated: true, role };

  const item = await container.repositories.archiveItem.findById(sourceId);
  if (
    !item ||
    item.tenantId !== authContext.tenantId ||
    item.deletedAt ||
    item.publicacaoStatus !== 'publicado' ||
    !isAccessLevelVisible(item.nivelAcesso, visibility)
  ) {
    return null;
  }

  const event = await container.repositories.event.findById(item.eventId);
  if (!event || event.tenantId !== authContext.tenantId || event.deletedAt) return null;

  let thumbnailUrl: string | null = null;
  if (item.capaMediaId) {
    const capaMedia = await container.repositories.archiveMedia.findById(item.capaMediaId);
    if (
      capaMedia &&
      capaMedia.tenantId === authContext.tenantId &&
      !capaMedia.deletedAt &&
      capaMedia.publicacaoStatus === 'publicado' &&
      isAccessLevelVisible(capaMedia.accessLevel, visibility)
    ) {
      thumbnailUrl = `/api/archive-media/${capaMedia.id}`;
    }
  }

  return {
    compositeId: buildArchiveItemId('archive-item', item.id),
    kind: 'archive-item',
    kindLabel: KIND_LABELS['archive-item'],
    titulo: item.titulo,
    descricao: item.descricao,
    autor: null,
    categoriaNome: ARCHIVE_ITEM_TYPE_LABELS[item.tipo],
    tipoDetalhado: null,
    thumbnailUrl,
    viewHref: `/acervo/eventos/${event.id}`,
    downloadHref: null,
    tamanhoBytes: null,
    dataReferencia: event.dataInicio,
    catalogadoEm: item.createdAt,
    legacyHref: `/acervo/eventos/${event.id}`,
    legacyLabel: 'Ver o álbum do evento',
    catalogo: null,
  };
}

/**
 * Resolve o "Item do Acervo" canônico a partir de um ID composto
 * (`kind:sourceId`) sem duplicar nenhum registro de origem — ver
 * `archive-item-id.ts`. Retorna `null` tanto para ID inválido quanto para
 * item inexistente/sem permissão/de outro tenant, deliberadamente sem
 * distinguir os casos (mesma cautela de privacidade já usada em
 * `GetPublicMemberProfileUseCase`).
 *
 * `role` é opcional (padrão `null`) — só o kind `archive-item` precisa dele
 * para `isAccessLevelVisible` decidir o nível `administracao`; chamadores
 * que não repassam a sessão continuam funcionando para os 4 kinds legados
 * (que não têm controle de nível de acesso) e, por padrão mais restritivo,
 * nunca resolvem um `archive-item` de nível `administracao` sem a role real.
 */
export async function resolveArchiveItem(
  compositeId: string,
  authContext: AuthContext,
  container: ServerContainer,
  role: Role | null = null,
): Promise<ResolvedArchiveItem | null> {
  const parsed = parseArchiveItemId(compositeId);
  if (!parsed) return null;

  const item = await (() => {
    switch (parsed.kind) {
      case 'file':
        return resolveFile(container, authContext, parsed.sourceId);
      case 'library':
        return resolveLibraryItem(container, authContext, parsed.sourceId);
      case 'gallery-album':
        return resolveGalleryAlbum(container, authContext, parsed.sourceId);
      case 'gallery-media':
        return resolveGalleryMedia(container, authContext, parsed.sourceId);
      case 'archive-item':
        return resolveNewArchiveItem(container, authContext, role, parsed.sourceId);
    }
  })();
  if (!item) return null;

  if (hasPermission(authContext, 'archiveCatalog:read')) {
    const entry = await container.useCases.getArchiveCatalogEntryByOrigemId.execute(
      authContext,
      compositeId,
    );
    if (entry) {
      item.catalogo = {
        tituloCurado: entry.tituloCurado,
        contextoHistorico: entry.contextoHistorico,
        tags: entry.tags,
      };
    }
  }

  return item;
}
