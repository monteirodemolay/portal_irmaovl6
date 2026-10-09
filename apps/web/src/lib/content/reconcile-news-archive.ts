import 'server-only';

import type { AuthContext, Event, News } from '@vl6/domain';
import type { createServerContainer } from '@vl6/infra';
import { findConfidentNewsEventMatch } from './news-event-auto-link';
import { syncNewsMediaToArchive } from './sync-news-media-to-archive';

const NEWS_SYNC_VERSION = 1;
const PAGE_SIZE = 500;
const MAX_EVENTS = 3000;
const MAX_NEWS = 1500;
const SOURCE_URL_REGEX = /(?:Importado de|Fonte original:)\s*<a href="([^"]+)"/;

type ServerContainer = ReturnType<typeof createServerContainer>;

export interface NewsArchiveReconciliationReport {
  scanned: number;
  alreadySynced: number;
  autoLinked: number;
  synced: number;
  unresolved: number;
  importedMedia: number;
  skippedMedia: number;
  errors: Array<{ newsId: string; titulo: string; message: string }>;
}

async function loadAllEvents(container: ServerContainer, tenantId: string): Promise<Event[]> {
  const items: Event[] = [];
  let cursor: string | undefined;
  while (items.length < MAX_EVENTS) {
    const page = await container.repositories.event.listAll(tenantId, {
      limit: Math.min(PAGE_SIZE, MAX_EVENTS - items.length),
      ...(cursor ? { cursor } : {}),
    });
    items.push(...page.items);
    if (!page.hasMore || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return items.filter((event) => !event.deletedAt);
}

async function loadPublishedNews(container: ServerContainer, tenantId: string): Promise<News[]> {
  const items: News[] = [];
  let cursor: string | undefined;
  while (items.length < MAX_NEWS) {
    const page = await container.repositories.news.listPublished(tenantId, {
      limit: Math.min(PAGE_SIZE, MAX_NEWS - items.length),
      ...(cursor ? { cursor } : {}),
    });
    items.push(...page.items);
    if (!page.hasMore || !page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return items.filter((news) => !news.deletedAt);
}

function originalSourceUrl(news: News): string | null {
  const match = news.conteudoHtml.match(SOURCE_URL_REGEX);
  return match?.[1]?.replace(/&amp;/g, '&') ?? null;
}

/**
 * Mantém a cadeia Notícia → Evento → ArchiveItem → ArchiveMedia convergente.
 * O vínculo automático só acontece com alta confiança. Quando não há base
 * histórica suficiente, o registro é reportado como `unresolved` em vez de
 * criar Evento, data ou local fictícios.
 */
export async function reconcilePublishedNewsArchive(
  container: ServerContainer,
  authContext: AuthContext,
): Promise<NewsArchiveReconciliationReport> {
  const [events, newsItems] = await Promise.all([
    loadAllEvents(container, authContext.tenantId),
    loadPublishedNews(container, authContext.tenantId),
  ]);
  const eventsById = new Map(events.map((event) => [event.id, event]));
  const report: NewsArchiveReconciliationReport = {
    scanned: 0,
    alreadySynced: 0,
    autoLinked: 0,
    synced: 0,
    unresolved: 0,
    importedMedia: 0,
    skippedMedia: 0,
    errors: [],
  };

  for (const original of newsItems) {
    report.scanned += 1;
    if ((original.archiveSyncVersion ?? 0) >= NEWS_SYNC_VERSION && original.eventId) {
      const linked = eventsById.get(original.eventId);
      if (linked && !linked.deletedAt) {
        report.alreadySynced += 1;
        continue;
      }
    }

    let news = original;
    let linkedEvent = news.eventId ? eventsById.get(news.eventId) ?? null : null;
    let wasAutoLinked = false;

    if (!linkedEvent) {
      const match = findConfidentNewsEventMatch(news.titulo, news.dataPublicacao, events);
      if (!match) {
        report.unresolved += 1;
        continue;
      }

      const now = new Date();
      news = {
        ...news,
        eventId: match.event.id,
        archiveSyncVersion: 0,
        updatedAt: now,
        updatedBy: authContext.uid,
      };
      await container.repositories.news.update(news);
      linkedEvent = eventsById.get(match.event.id) ?? null;
      wasAutoLinked = true;
      report.autoLinked += 1;
    }

    if (!linkedEvent) {
      report.unresolved += 1;
      continue;
    }

    try {
      const sync = await syncNewsMediaToArchive({
        container,
        authContext,
        news,
        // Na primeira reconciliação, consulta novamente a matéria original
        // para capturar também vídeos/documentos que não ficaram no HTML salvo.
        sourceUrl: originalSourceUrl(news),
      });

      report.importedMedia += sync.imported;
      report.skippedMedia += sync.skipped;
      if (sync.errors.length > 0) {
        report.errors.push({ newsId: news.id, titulo: news.titulo, message: sync.errors.join(' ') });
        continue;
      }

      await container.repositories.news.update({
        ...news,
        archiveSyncVersion: NEWS_SYNC_VERSION,
        updatedAt: wasAutoLinked ? news.updatedAt : new Date(),
        updatedBy: authContext.uid,
      });
      report.synced += 1;
    } catch (error) {
      report.errors.push({
        newsId: news.id,
        titulo: news.titulo,
        message: error instanceof Error ? error.message : 'Falha desconhecida na reconciliação.',
      });
    }
  }

  return report;
}
