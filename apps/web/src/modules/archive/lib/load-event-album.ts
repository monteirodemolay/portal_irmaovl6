import 'server-only';
import type { AuthContext, Member, Role } from '@vl6/domain';
import type { ServerContainer } from '@vl6/infra';
import type { ArchiveMediaTypeKey } from '@vl6/shared';
import { isAccessLevelVisible } from './access-level-visibility';

export interface EventAlbumMediaItem {
  id: string;
  archiveItemId: string;
  mediaType: ArchiveMediaTypeKey;
  order: number;
  caption: string | null;
  altText: string | null;
  isCover: boolean;
  allowDownload: boolean;
  autor: string | null;
  /** Sempre o proxy autenticado `/api/archive-media/[archiveMediaId]` — nunca a URL crua do Vercel Blob. */
  src: string;
  /**
   * Miniatura de vídeo capturada no browser (Fase B "Publicação
   * avançada") — `/api/archive-media/[archiveMediaId]?variant=poster`, ou
   * `null` quando `mediaType !== 'video'` ou a captura falhou/não rodou.
   */
  posterUrl: string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  /**
   * Pessoas marcadas nesta mídia (Fase A "Pessoas & Descoberta") já
   * resolvidas para exibição — nome + link para `/acervo/pessoas/[id]`.
   * `Member`s excluídos/de outro tenant nunca aparecem aqui.
   */
  pessoasIdentificadas: { id: string; nomeCompleto: string }[];
  /** Ponto focal do recorte (0-100) — `null` usa o centro padrão do navegador. */
  focalX: number | null;
  focalY: number | null;
}

export interface EventAlbumData {
  event: {
    id: string;
    titulo: string;
    descricao: string | null;
    local: string;
    dataInicio: Date;
    dataFim: Date | null;
  };
  boardTermNome: string | null;
  coverMedia: EventAlbumMediaItem | null;
  media: EventAlbumMediaItem[];
  /** Link do post no Instagram registrado em algum `ArchiveItem` deste Evento — puro registro, `null` se nunca preenchido. */
  instagramUrl: string | null;
}

/**
 * Monta o modelo de exibição da página álbum pública de um evento
 * (`/acervo/eventos/[eventId]`, Fase 4). Aplica as duas filtragens que a
 * experiência pública exige e que a Central de Publicação administrativa
 * (Fases 2/3) não precisa: só `publicacaoStatus: 'publicado'` (item e
 * mídia) e só níveis de `accessLevel` visíveis à sessão atual
 * (`isAccessLevelVisible`). `null` quando o Evento não existe/não é do
 * tenant, ou quando não há nenhum `ArchiveItem` publicado — o chamador
 * decide entre `notFound()` e uma tela vazia.
 */
export async function loadEventAlbum(
  container: ServerContainer,
  authContext: AuthContext,
  role: Role | null,
  eventId: string,
): Promise<EventAlbumData | null> {
  const event = await container.repositories.event.findById(eventId);
  if (!event || event.tenantId !== authContext.tenantId || event.deletedAt) return null;

  const visibility = { authenticated: true, role };

  const items = (await container.repositories.archiveItem.findByEventId(eventId)).filter(
    (item) =>
      item.tenantId === authContext.tenantId &&
      !item.deletedAt &&
      item.publicacaoStatus === 'publicado' &&
      isAccessLevelVisible(item.nivelAcesso, visibility),
  );
  if (items.length === 0) return null;

  const mediaByItem = await Promise.all(
    items.map((item) => container.repositories.archiveMedia.findByArchiveItemId(item.id)),
  );
  const publishedMedia = mediaByItem
    .flat()
    .filter(
      (media) =>
        media.tenantId === authContext.tenantId &&
        !media.deletedAt &&
        media.publicacaoStatus === 'publicado' &&
        isAccessLevelVisible(media.accessLevel, visibility),
    );
  if (publishedMedia.length === 0) return null;

  const assets = await Promise.all(
    publishedMedia.map((media) => container.repositories.mediaAsset.findById(media.mediaAssetId)),
  );

  const memberIds = [
    ...new Set(publishedMedia.flatMap((media) => media.pessoasIdentificadas ?? [])),
  ];
  const members = await Promise.all(
    memberIds.map((memberId) => container.repositories.member.findById(memberId)),
  );
  const memberNameById = new Map(
    members
      .filter(
        (member): member is Member => member !== null && member.tenantId === authContext.tenantId,
      )
      .map((member) => [member.id, member.nomeCompleto]),
  );

  const media: EventAlbumMediaItem[] = publishedMedia
    .map((archiveMedia, index) => {
      const asset = assets[index];
      if (!asset || asset.tenantId !== authContext.tenantId || asset.deletedAt) return null;
      const item: EventAlbumMediaItem = {
        id: archiveMedia.id,
        archiveItemId: archiveMedia.archiveItemId,
        mediaType: archiveMedia.mediaType,
        order: archiveMedia.order,
        caption: archiveMedia.caption,
        altText: archiveMedia.altText,
        isCover: archiveMedia.isCover,
        allowDownload: archiveMedia.allowDownload,
        autor: archiveMedia.autor,
        src: `/api/archive-media/${archiveMedia.id}`,
        posterUrl:
          archiveMedia.mediaType === 'video' && archiveMedia.posterMediaAssetId
            ? `/api/archive-media/${archiveMedia.id}?variant=poster`
            : null,
        originalName: asset.originalName,
        mimeType: asset.mimeType,
        sizeBytes: asset.size,
        pessoasIdentificadas: (archiveMedia.pessoasIdentificadas ?? [])
          .filter((memberId) => memberNameById.has(memberId))
          .map((memberId) => ({ id: memberId, nomeCompleto: memberNameById.get(memberId)! })),
        focalX: archiveMedia.focalX ?? null,
        focalY: archiveMedia.focalY ?? null,
      };
      return item;
    })
    .filter((entry): entry is EventAlbumMediaItem => entry !== null)
    .sort((a, b) => a.order - b.order);

  const coverMedia =
    media.find((entry) => entry.isCover) ??
    media.find((entry) => entry.mediaType === 'foto') ??
    null;

  const boardTermId = items.find((item) => item.boardTermId)?.boardTermId ?? null;
  const boardTerm = boardTermId ? await container.repositories.boardTerm.findById(boardTermId) : null;

  return {
    event: {
      id: event.id,
      titulo: event.titulo,
      descricao: event.descricao,
      local: event.local,
      dataInicio: event.dataInicio,
      dataFim: event.dataFim,
    },
    boardTermNome: boardTerm?.nome ?? null,
    coverMedia,
    media,
    instagramUrl: items.find((item) => item.instagramUrl)?.instagramUrl ?? null,
  };
}

export interface EventArchiveSummary {
  totalCount: number;
  fotos: number;
  videos: number;
  audios: number;
  documentos: number;
}

/**
 * Resumo leve — só contagens, sem resolver `MediaAsset` — usado pela
 * listagem `/acervo/eventos` (Fase 4) para decidir se o card de um evento
 * linka para o álbum público (`/acervo/eventos/[eventId]`) ou continua
 * linkando para a página operacional da Agenda (`/eventos/[eventId]`,
 * comportamento intocado quando não há conteúdo publicado). `null` quando
 * não há nenhuma mídia publicada vinculada ao evento.
 */
export async function loadEventArchiveSummary(
  container: ServerContainer,
  tenantId: string,
  eventId: string,
): Promise<EventArchiveSummary | null> {
  const items = (await container.repositories.archiveItem.findByEventId(eventId)).filter(
    (item) =>
      item.tenantId === tenantId && !item.deletedAt && item.publicacaoStatus === 'publicado',
  );
  if (items.length === 0) return null;

  const mediaByItem = await Promise.all(
    items.map((item) => container.repositories.archiveMedia.findByArchiveItemId(item.id)),
  );
  const media = mediaByItem
    .flat()
    .filter((m) => m.tenantId === tenantId && !m.deletedAt && m.publicacaoStatus === 'publicado');
  if (media.length === 0) return null;

  const summary: EventArchiveSummary = { totalCount: media.length, fotos: 0, videos: 0, audios: 0, documentos: 0 };
  for (const item of media) {
    if (item.mediaType === 'foto') summary.fotos += 1;
    else if (item.mediaType === 'video') summary.videos += 1;
    else if (item.mediaType === 'audio') summary.audios += 1;
    else if (item.mediaType === 'documento') summary.documentos += 1;
  }
  return summary;
}
