import type { ArchiveMedia } from '@vl6/domain';

/** Eventos sem foto/vídeo publicado e com binário não entram na Constelação. */
export function isConstellationVisualMedia(
  media: Pick<ArchiveMedia, 'mediaType' | 'publicacaoStatus' | 'deletedAt' | 'mediaAssetId'>,
): boolean {
  return (
    !media.deletedAt &&
    media.publicacaoStatus === 'publicado' &&
    (media.mediaType === 'foto' || media.mediaType === 'video') &&
    Boolean(media.mediaAssetId?.trim())
  );
}
