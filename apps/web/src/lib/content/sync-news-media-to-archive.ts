import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import type { AuthContext, News } from '@vl6/domain';
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

async function findAutoItem(container: ServerContainer, eventId: string, newsId: string) {
  const items = await container.repositories.archiveItem.findByEventId(eventId);
  return items.find((item) => item.origemNewsId === newsId && !item.deletedAt) ?? null;
}

async function moveAutoItemToEvent(
  container: ServerContainer,
  authContext: AuthContext,
  newsId: string,
  previousEventId: string,
  nextEventId: string,
): Promise<void> {
  const item = await findAutoItem(container, previousEventId, newsId);
  if (!item) return;
  const event = await container.repositories.event.findById(nextEventId);
  if (!event || event.tenantId !== authContext.tenantId || event.deletedAt) return;

  await container.repositories.archiveItem.update({
    ...item,
    eventId: event.id,
    boardTermId: event.boardTermId ?? null,
    updatedAt: new Date(),
    updatedBy: authContext.uid,
  });
  const medias = await container.repositories.archiveMedia.findByArchiveItemId(item.id);
  await Promise.all(medias.map((media) =>
    container.repositories.archiveMedia.update({
      ...media,
      eventId: event.id,
      boardTermId: event.boardTermId ?? null,
      updatedAt: new Date(),
      updatedBy: authContext.uid,
    }),
  ));
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
        const oldItem = await findAutoItem(container, previousEventId, news.id);
        if (oldItem) await container.useCases.softDeleteArchiveItem.execute(authContext, oldItem.id);
      }
      return result;
    }

    const event = await container.repositories.event.findById(news.eventId);
    if (!event || event.tenantId !== authContext.tenantId || event.deletedAt) {
      result.errors.push('Evento relacionado não encontrado.');
      return result;
    }

    if (previousEventId && previousEventId !== news.eventId) {
      await moveAutoItemToEvent(container, authContext, news.id, previousEventId, news.eventId);
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

    let item = await findAutoItem(container, event.id, news.id);
    if (!item) {
      const created = await container.useCases.createArchiveItem.execute(authContext, {
        eventId: event.id,
        boardTermId: event.boardTermId ?? null,
        titulo: `Mídias da notícia: ${news.titulo}`,
        tipo: 'outro',
        descricao: 'Conteúdo importado automaticamente de notícia institucional vinculada a este acontecimento.',
        nivelAcesso: event.nivelAcesso,
      });
      if (!created.ok) {
        result.errors.push(created.error.message);
        return result;
      }
      item = { ...created.value, origemNewsId: news.id };
      await container.repositories.archiveItem.update(item);
    }
    result.archiveItemId = item.id;

    const existingMedia = await container.repositories.archiveMedia.findByArchiveItemId(item.id);
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
      let mediaAsset = await container.repositories.mediaAsset.findBySha256(authContext.tenantId, sha256);

      if (!mediaAsset) {
        const storageKey = `tenants/${authContext.tenantId}/archive/news/${news.id}/${randomUUID()}-${originalName}`;
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
        archiveItemId: item.id,
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

      if (item.publicacaoStatus === 'publicado') {
        await container.repositories.archiveMedia.update({
          ...attached.value,
          publicacaoStatus: 'publicado',
          updatedAt: new Date(),
          updatedBy: authContext.uid,
        });
      }
      if (mediaType === 'foto' && !item.capaMediaId && !firstNewPhotoId) firstNewPhotoId = attached.value.id;
      existingHashes.add(sha256);
      nextOrder += 1;
      result.imported += 1;
    }

    if (firstNewPhotoId && !item.capaMediaId) {
      await container.useCases.setArchiveItemCover.execute(authContext, item.id, firstNewPhotoId);
    }
    if (item.publicacaoStatus !== 'publicado') {
      const published = await container.useCases.publishArchiveItem.execute(authContext, item.id);
      if (!published.ok) result.errors.push(published.error.message);
    }
  } catch (error) {
    logger.error('Falha ao sincronizar mídias de notícia com o Acervo VL6', {
      route: 'syncNewsMediaToArchive',
      newsId: news.id,
      ...(error instanceof Error ? { message: error.message } : {}),
    });
    result.errors.push(error instanceof Error ? error.message : 'Falha inesperada na sincronização.');
  }

  return result;
}
