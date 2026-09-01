import 'server-only';
import type { ArchiveMediaCounts, AuthContext, Role } from '@vl6/domain';
import type { ServerContainer } from '@vl6/infra';
import { isAccessLevelVisible } from './access-level-visibility';

export interface PublishedArchiveEventCard {
  eventId: string;
  titulo: string;
  local: string;
  dataInicio: Date;
  counts: ArchiveMediaCounts;
  /** Capa (miniatura de foto marcada `isCover`, ou a primeira foto publicada). */
  coverSrc: string | null;
}

/**
 * Um card por Evento com conteúdo publicado no Acervo VL6 (Central de
 * Publicação, Fases 2-3) — a peça que faltava pras listagens "Fotos e
 * Vídeos"/"Documentos" (docs/architecture/11-acervo-vl6.md): elas só
 * liam os modelos legados (`GalleryAlbum`/`FileAsset`), então tudo
 * publicado pela Central de Publicação ficava "invisível" ali, só
 * alcançável por quem já sabia ir direto em `/acervo/eventos`. Mesma
 * filtragem de `loadEventAlbum`/`loadArchiveSearchResults` (publicado +
 * nível de acesso visível à sessão), agrupada por Evento em vez de por
 * `ArchiveItem` — um Evento pode ter mais de um item (ex.: fotos e
 * documentos cadastrados em lotes separados).
 */
export async function loadPublishedArchiveEventCards(
  container: ServerContainer,
  authContext: AuthContext,
  role: Role | null,
): Promise<PublishedArchiveEventCard[]> {
  const visibility = { authenticated: true, role };

  const itemsPage = await container.repositories.archiveItem.findByTenant(authContext.tenantId, {
    limit: 2000,
  });
  const publishedItems = itemsPage.items.filter(
    (item) =>
      !item.deletedAt &&
      item.publicacaoStatus === 'publicado' &&
      isAccessLevelVisible(item.nivelAcesso, visibility),
  );
  if (publishedItems.length === 0) return [];

  const [events, mediaByItem] = await Promise.all([
    Promise.all(publishedItems.map((item) => container.repositories.event.findById(item.eventId))),
    Promise.all(
      publishedItems.map((item) => container.repositories.archiveMedia.findByArchiveItemId(item.id)),
    ),
  ]);

  const cardByEventId = new Map<string, PublishedArchiveEventCard>();

  publishedItems.forEach((item, index) => {
    const event = events[index];
    if (!event || event.tenantId !== authContext.tenantId || event.deletedAt) return;

    const media = (mediaByItem[index] ?? []).filter(
      (candidate) =>
        !candidate.deletedAt &&
        candidate.publicacaoStatus === 'publicado' &&
        isAccessLevelVisible(candidate.accessLevel, visibility),
    );
    if (media.length === 0) return;

    const card = cardByEventId.get(event.id) ?? {
      eventId: event.id,
      titulo: event.titulo,
      local: event.local,
      dataInicio: event.dataInicio,
      counts: { foto: 0, video: 0, audio: 0, documento: 0 },
      coverSrc: null,
    };
    for (const item2 of media) {
      card.counts[item2.mediaType] += 1;
      if (item2.mediaType === 'foto' && (item2.isCover || !card.coverSrc)) {
        card.coverSrc = `/api/archive-media/${item2.id}`;
      }
    }
    cardByEventId.set(event.id, card);
  });

  return [...cardByEventId.values()].sort(
    (a, b) => b.dataInicio.getTime() - a.dataInicio.getTime(),
  );
}

export interface PublishedArchiveDocument {
  id: string;
  eventId: string;
  eventTitulo: string;
  titulo: string;
  caption: string | null;
  mimeType: string;
  src: string;
  allowDownload: boolean;
  createdAt: Date;
}

/**
 * Um item por documento publicado via Central de Publicação (mesma
 * filtragem/motivo de `loadPublishedArchiveEventCards`, granularidade
 * diferente: aqui cada `ArchiveMedia` do tipo `documento` vira um item
 * próprio na listagem "Documentos", não agrupado por Evento — mais perto
 * de como `FileAsset` já aparece ali.
 */
export async function loadPublishedArchiveDocuments(
  container: ServerContainer,
  authContext: AuthContext,
  role: Role | null,
): Promise<PublishedArchiveDocument[]> {
  const visibility = { authenticated: true, role };

  const itemsPage = await container.repositories.archiveItem.findByTenant(authContext.tenantId, {
    limit: 2000,
  });
  const publishedItems = itemsPage.items.filter(
    (item) =>
      !item.deletedAt &&
      item.publicacaoStatus === 'publicado' &&
      isAccessLevelVisible(item.nivelAcesso, visibility),
  );
  if (publishedItems.length === 0) return [];

  const [events, mediaByItem] = await Promise.all([
    Promise.all(publishedItems.map((item) => container.repositories.event.findById(item.eventId))),
    Promise.all(
      publishedItems.map((item) => container.repositories.archiveMedia.findByArchiveItemId(item.id)),
    ),
  ]);

  const documentMedia = publishedItems.flatMap((item, index) => {
    const event = events[index];
    if (!event || event.tenantId !== authContext.tenantId || event.deletedAt) return [];
    return (mediaByItem[index] ?? [])
      .filter(
        (media) =>
          !media.deletedAt &&
          media.mediaType === 'documento' &&
          media.publicacaoStatus === 'publicado' &&
          isAccessLevelVisible(media.accessLevel, visibility),
      )
      .map((media) => ({ media, event }));
  });
  if (documentMedia.length === 0) return [];

  const assets = await Promise.all(
    documentMedia.map(({ media }) => container.repositories.mediaAsset.findById(media.mediaAssetId)),
  );

  return documentMedia
    .map(({ media, event }, index) => {
      const asset = assets[index];
      if (!asset || asset.deletedAt) return null;
      const document: PublishedArchiveDocument = {
        id: media.id,
        eventId: event.id,
        eventTitulo: event.titulo,
        titulo: media.caption ?? asset.originalName,
        caption: media.caption,
        mimeType: asset.mimeType,
        src: `/api/archive-media/${media.id}`,
        allowDownload: media.allowDownload,
        createdAt: media.createdAt,
      };
      return document;
    })
    .filter((entry): entry is PublishedArchiveDocument => entry !== null)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}
