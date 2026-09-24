import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import type { ArchiveItem, ArchiveMedia, AuthContext, News } from '@vl6/domain';
import type { ServerContainer } from '@vl6/infra';
import { VercelBlobStorageAdapter } from '@vl6/infra';
import { logger, type ArchiveMediaTypeKey } from '@vl6/shared';
import { scrapeNewsMetadata, type ScrapedNewsMedia } from './scrape-news-metadata';

const MAX_IMPORTED_MEDIA_BYTES = 50 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 25_000;

export interface NewsArchiveSyncResult {
  imported: number;
  skipped: number;
  errors: string[];
  archiveItemId: string | null;
}

function sourceHostAllowed(value: string): boolean {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return (
      host === 'vl6.com.br' ||
      host.endsWith('.vl6.com.br') ||
      host === 'wixstatic.com' ||
      host.endsWith('.wixstatic.com') ||
      host === 'wixmp.com' ||
      host.endsWith('.wixmp.com') ||
      host === 'filesusr.com' ||
      host.endsWith('.filesusr.com')
    );
  } catch {
    return false;
  }
}

function mediaTypeFromMime(mimeType: string, url: string): ArchiveMediaTypeKey | null {
  const mime = mimeType.toLowerCase();
  if (['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mime)) return 'foto';
  if (['video/mp4', 'video/webm', 'video/quicktime'].includes(mime)) return 'video';
  if (['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/webm'].includes(mime)) return 'audio';
  if (
    [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ].includes(mime)
  ) return 'documento';

  if (/\.(jpe?g|png|webp|gif)(?:\?|$)/i.test(url)) return 'foto';
  if (/\.(mp4|webm|mov|m4v)(?:\?|$)/i.test(url)) return 'video';
  if (/\.(pdf|docx?|xlsx?|pptx?)(?:\?|$)/i.test(url)) return 'documento';
  return null;
}

function extensionFrom(mimeType: string, url: string): string {
  const byMime: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
    'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
    'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/wav': 'wav', 'audio/ogg': 'ogg',
    'application/pdf': 'pdf', 'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  };
  if (byMime[mimeType.toLowerCase()]) return byMime[mimeType.toLowerCase()]!;
  const match = new URL(url).pathname.match(/\.([a-z0-9]{2,5})$/i);
  return match?.[1]?.toLowerCase() ?? 'bin';
}

function collectMediaFromNews(news: News): ScrapedNewsMedia[] {
  const found = new Map<string, ScrapedNewsMedia>();
  if (news.imagemCapaUrl) found.set(news.imagemCapaUrl, { url: news.imagemCapaUrl, kind: 'image' });

  for (const match of news.conteudoHtml.matchAll(/<img\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1/gi)) {
    const url = match[2]?.replace(/&amp;/g, '&');
    if (url) found.set(url, { url, kind: 'image' });
  }
  for (const match of news.conteudoHtml.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1/gi)) {
    const url = match[2]?.replace(/&amp;/g, '&');
    if (!url) continue;
    if (/\.(pdf|docx?|xlsx?|pptx?)(?:\?|$)/i.test(url)) found.set(url, { url, kind: 'document' });
    else if (/\.(mp4|webm|mov|m4v)(?:\?|$)/i.test(url)) found.set(url, { url, kind: 'video' });
  }
  return [...found.values()];
}

async function fetchMedia(url: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  if (!sourceHostAllowed(url)) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'PortalVL6-Acervo/1.0' },
    });
    if (!response.ok) return null;
    const declaredLength = Number(response.headers.get('content-length') ?? 0);
    if (declaredLength > MAX_IMPORTED_MEDIA_BYTES) return null;
    const mimeType = (response.headers.get('content-type') ?? 'application/octet-stream')
      .split(';')[0]!.trim().toLowerCase();
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMPORTED_MEDIA_BYTES) return null;
    return { buffer, mimeType };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function chooseCanonicalEventItem(items: ArchiveItem[]): ArchiveItem | null {
  const candidates = items.filter((item) => !item.deletedAt && !item.origemNewsId);
  return (
    candidates.find((item) => item.publicacaoStatus === 'publicado') ??
    candidates.find((item) => item.publicacaoStatus === 'pronto_para_publicar') ??
    candidates[0] ??
    null
  );
}

async function findTechnicalNewsItem(
  container: ServerContainer,
  eventId: string,
  newsId: string,
): Promise<ArchiveItem | null> {
  const items = await container.repositories.archiveItem.findByEventId(eventId);
  return items.find((item) => item.origemNewsId === newsId && !item.deletedAt) ?? null;
}

async function mediaForNewsInEvent(
  container: ServerContainer,
  eventId: string,
  newsId: string,
): Promise<ArchiveMedia[]> {
  const items = await container.repositories.archiveItem.findByEventId(eventId);
  const mediaByItem = await Promise.all(
    items.filter((item) => !item.deletedAt).map((item) =>
      container.repositories.archiveMedia.findByArchiveItemId(item.id),
    ),
  );
  return mediaByItem.flat().filter((media) => !media.deletedAt && media.origemNewsId === newsId);
}

async function migrateLegacyTechnicalItem(
  container: ServerContainer,
  authContext: AuthContext,
  eventId: string,
  newsId: string,
  targetItem: ArchiveItem,
): Promise<void> {
  const legacyItem = await findTechnicalNewsItem(container, eventId, newsId);
  if (!legacyItem || legacyItem.id === targetItem.id) return;

  const legacyMedia = await container.repositories.archiveMedia.findByArchiveItemId(legacyItem.id);
  for (const media of legacyMedia) {
    await container.repositories.archiveMedia.update({
      ...media,
      archiveItemId: targetItem.id,
      eventId: targetItem.eventId,
      boardTermId: targetItem.boardTermId,
      origemNewsId: newsId,
      isCover: false,
      updatedAt: new Date(),
      updatedBy: authContext.uid,
    });
  }
  await container.repositories.archiveItem.softDelete(legacyItem.id, new Date(), authContext.uid);
}

async function resolveTargetItem(
  container: ServerContainer,
  authContext: AuthContext,
  eventId: string,
  news: News,
): Promise<ArchiveItem | null> {
  const items = await container.repositories.archiveItem.findByEventId(eventId);
  const canonical = chooseCanonicalEventItem(items);

  if (canonical) {
    await migrateLegacyTechnicalItem(container, authContext, eventId, news.id, canonical);
    return canonical;
  }

  // Compatibilidade estrutural: ArchiveMedia ainda exige ArchiveItem pai.
  // Quando o Evento ainda não possui nenhum item canônico, criamos um
  // contêiner técnico que NÃO entra nas listagens/pesquisas do Acervo.
  // Assim, para o usuário a mídia pertence somente ao Evento.
  const existingTechnical = items.find(
    (item) => item.origemNewsId === news.id && !item.deletedAt,
  );
  if (existingTechnical) return existingTechnical;

  const event = await container.repositories.event.findById(eventId);
  if (!event || event.tenantId !== authContext.tenantId || event.deletedAt) return null;

  const created = await container.useCases.createArchiveItem.execute(authContext, {
    eventId: event.id,
    boardTermId: event.boardTermId ?? null,
    titulo: event.titulo,
    tipo: 'outro',
    descricao: 'Contêiner técnico de mídias importadas de notícia vinculada ao Evento.',
    nivelAcesso: event.nivelAcesso,
  });
  if (!created.ok) return null;

  const technical = { ...created.value, origemNewsId: news.id };
  await container.repositories.archiveItem.update(technical);
  return technical;
}

async function moveNewsMediaBetweenEvents(
  container: ServerContainer,
  authContext: AuthContext,
  newsId: string,
  previousEventId: string,
  nextEventId: string,
  targetItem: ArchiveItem,
): Promise<void> {
  const previousMedia = await mediaForNewsInEvent(container, previousEventId, newsId);
  for (const media of previousMedia) {
    await container.repositories.archiveMedia.update({
      ...media,
      archiveItemId: targetItem.id,
      eventId: nextEventId,
      boardTermId: targetItem.boardTermId,
      isCover: false,
      updatedAt: new Date(),
      updatedBy: authContext.uid,
    });
  }

  const oldTechnical = await findTechnicalNewsItem(container, previousEventId, newsId);
  if (oldTechnical) {
    await container.repositories.archiveItem.softDelete(oldTechnical.id, new Date(), authContext.uid);
  }
}

async function removeNewsMediaFromEvent(
  container: ServerContainer,
  authContext: AuthContext,
  eventId: string,
  newsId: string,
): Promise<void> {
  const media = await mediaForNewsInEvent(container, eventId, newsId);
  await Promise.all(
    media.map((entry) =>
      container.repositories.archiveMedia.softDelete(entry.id, new Date(), authContext.uid),
    ),
  );

  const technical = await findTechnicalNewsItem(container, eventId, newsId);
  if (technical) {
    await container.repositories.archiveItem.softDelete(technical.id, new Date(), authContext.uid);
  }
}

export async function syncNewsMediaToArchive(input: {
  container: ServerContainer;
  authContext: AuthContext;
  news: News;
  previousEventId?: string | null;
  sourceUrl?: string | null;
  scrapedMedia?: ScrapedNewsMedia[];
}): Promise<NewsArchiveSyncResult> {
  const { container, authContext, news, previousEventId = null } = input;
  const result: NewsArchiveSyncResult = { imported: 0, skipped: 0, errors: [], archiveItemId: null };

  try {
    if (!news.eventId) {
      if (previousEventId) {
        await removeNewsMediaFromEvent(container, authContext, previousEventId, news.id);
      }
      return result;
    }

    const event = await container.repositories.event.findById(news.eventId);
    if (!event || event.tenantId !== authContext.tenantId || event.deletedAt) {
      result.errors.push('Evento relacionado não encontrado.');
      return result;
    }

    const targetItem = await resolveTargetItem(container, authContext, event.id, news);
    if (!targetItem) {
      result.errors.push('Não foi possível localizar o contêiner do Evento no Acervo.');
      return result;
    }
    result.archiveItemId = targetItem.id;

    if (previousEventId && previousEventId !== news.eventId) {
      await moveNewsMediaBetweenEvents(
        container,
        authContext,
        news.id,
        previousEventId,
        news.eventId,
        targetItem,
      );
    }

    let media = input.scrapedMedia ?? null;
    if (!media && input.sourceUrl) {
      const scraped = await scrapeNewsMetadata(input.sourceUrl);
      media = scraped.ok ? scraped.media : null;
    }
    const candidates = media?.length ? media : collectMediaFromNews(news);
    const unique = [...new Map(candidates.map((entry) => [entry.url, entry])).values()]
      .filter((entry) => sourceHostAllowed(entry.url))
      .slice(0, 60);
    if (unique.length === 0) return result;

    const existingMedia = await container.repositories.archiveMedia.findByArchiveItemId(targetItem.id);
    const existingAssets = await Promise.all(
      existingMedia.map((entry) => container.repositories.mediaAsset.findById(entry.mediaAssetId)),
    );
    const existingHashes = new Set(
      existingAssets
        .filter((asset): asset is NonNullable<typeof asset> => Boolean(asset))
        .map((asset) => asset.sha256),
    );

    const storage = new VercelBlobStorageAdapter();
    let nextOrder = existingMedia.length;
    let firstNewPhotoId: string | null = null;

    for (const candidate of unique) {
      const downloaded = await fetchMedia(candidate.url);
      if (!downloaded) { result.skipped += 1; continue; }

      const mediaType = mediaTypeFromMime(downloaded.mimeType, candidate.url);
      if (!mediaType) { result.skipped += 1; continue; }

      const sha256 = createHash('sha256').update(downloaded.buffer).digest('hex');
      if (existingHashes.has(sha256)) { result.skipped += 1; continue; }

      const extension = extensionFrom(downloaded.mimeType, candidate.url);
      const originalName = `noticia-${news.id}-${nextOrder + 1}.${extension}`;
      let mediaAsset = await container.repositories.mediaAsset.findBySha256(
        authContext.tenantId,
        sha256,
      );

      if (!mediaAsset) {
        const storageKey =
          `tenants/${authContext.tenantId}/archive/news/${news.id}/${randomUUID()}-${originalName}`;
        const upload = await storage.upload({
          path: storageKey,
          buffer: downloaded.buffer,
          contentType: downloaded.mimeType,
        });
        const registered = await container.useCases.registerMediaAsset.execute(authContext, {
          originalName,
          normalizedName: originalName,
          mimeType: downloaded.mimeType,
          extension,
          size: upload.sizeBytes,
          sha256,
          provider: 'vercel_blob',
          storageKey,
          width: null,
          height: null,
          duration: null,
        });
        if (!registered.ok) {
          await storage.delete(storageKey).catch(() => {});
          result.errors.push(registered.error.message);
          continue;
        }
        mediaAsset = registered.value.mediaAsset;
      }

      const attached = await container.useCases.attachMediaToArchiveItem.execute(authContext, {
        archiveItemId: targetItem.id,
        mediaAssetId: mediaAsset.id,
        mediaType,
        documentType: mediaType === 'documento' ? downloaded.mimeType : null,
        role: 'Mídia de notícia',
        order: nextOrder,
        caption: news.titulo,
        altText: null,
        accessLevel: event.nivelAcesso,
        allowDownload: mediaType === 'documento',
      });
      if (!attached.ok) {
        result.errors.push(attached.error.message);
        continue;
      }

      const linkedMedia: ArchiveMedia = {
        ...attached.value,
        origemNewsId: news.id,
        publicacaoStatus:
          targetItem.publicacaoStatus === 'publicado' ? 'publicado' : attached.value.publicacaoStatus,
        updatedAt: new Date(),
        updatedBy: authContext.uid,
      };
      await container.repositories.archiveMedia.update(linkedMedia);

      if (mediaType === 'foto' && !targetItem.capaMediaId && !firstNewPhotoId) {
        firstNewPhotoId = linkedMedia.id;
      }
      existingHashes.add(sha256);
      nextOrder += 1;
      result.imported += 1;
    }

    if (firstNewPhotoId && !targetItem.capaMediaId) {
      await container.useCases.setArchiveItemCover.execute(
        authContext,
        targetItem.id,
        firstNewPhotoId,
      );
    }

    if (targetItem.publicacaoStatus !== 'publicado') {
      const published = await container.useCases.publishArchiveItem.execute(
        authContext,
        targetItem.id,
      );
      if (!published.ok) result.errors.push(published.error.message);
    }
  } catch (error) {
    logger.error('Falha ao sincronizar mídias de notícia com o Acervo VL6', {
      route: 'syncNewsMediaToArchive',
      newsId: news.id,
      ...(error instanceof Error ? { message: error.message } : {}),
    });
    result.errors.push(
      error instanceof Error ? error.message : 'Falha inesperada na sincronização.',
    );
  }

  return result;
}
