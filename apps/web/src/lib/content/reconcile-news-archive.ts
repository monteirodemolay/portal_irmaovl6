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

export interface SingleNewsArchiveReconciliation {
  status: 'already_synced' | 'synced' | 'unresolved' | 'error';
  autoLinked: boolean;
  importedMedia: number;
  skippedMedia: number;
  errors: string[];
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

export function originalNewsSourceUrl(news: News): string | null {
  const match = news.conteudoHtml.match(SOURCE_URL_REGEX);
  return match?.[1]?.replace(/&amp;/g, '&') ?? null;
}

/**
 * Reconcilia uma matéria publicada. O vínculo automático só acontece com
 * evidência forte; em dúvida, retorna `unresolved` e não altera a história.
 */
export async function reconcileOnePublishedNewsArchive(
  container: ServerContainer,
  authContext: AuthContext,
  original: News,
  knownEvents?: Event[],
): Promise<SingleNewsArchiveReconciliation> {
  const events = knownEvents ?? (await loadAllEvents(container, authContext.tenantId));
  const eventsById = new Map(events.map((event) => [event.id, event]));

  if ((original.archiveSyncVersion ?? 0) >= NEWS_SYNC_VERSION && original.eventId) {
    const linked = eventsById.get(original.eventId);
    if (linked && !linked.deletedAt) {
      return {
        status: 'already_synced',
        autoLinked: false,
        importedMedia: 0,
        skippedMedia: 0,
        errors: [],
      };
    }
  }

  let news = original;
  let linkedEvent = news.eventId ? eventsById.get(news.eventId) ?? null : null;
  let autoLinked = false;

  if (!linkedEvent) {
    const match = findConfidentNewsEventMatch(news.titulo, news.dataPublicacao, events);
    if (!match) {
      return {
        status: 'unresolved',
        autoLinked: false,
        importedMedia: 0,
        skippedMedia: 0,
        errors: [],
      };
    }

    news = {
      ...news,
      eventId: match.event.id,
      archiveSyncVersion: 0,
      updatedAt: new Date(),
      updatedBy: authContext.uid,
    };
    await container.repositories.news.update(news);
    linkedEvent = eventsById.get(match.event.id) ?? null;
    autoLinked = true;
  }

  if (!linkedEvent) {
    return {
      status: 'unresolved',
      autoLinked,
      importedMedia: 0,
      skippedMedia: 0,
      errors: [],
    };
  }

  try {
    const sync = await syncNewsMediaToArchive({
      container,
      authContext,
      news,
      // Reconsulta a matéria de origem quando disponível: o HTML salvo da
      // notícia pode não conter vídeos/documentos que existiam no Wix.
      sourceUrl: originalNewsSourceUrl(news),
    });

    if (sync.errors.length > 0) {
      return {
        status: 'error',
        autoLinked,
        importedMedia: sync.imported,
        skippedMedia: sync.skipped,
        errors: sync.errors,
      };
    }

    await container.repositories.news.update({
      ...news,
      archiveSyncVersion: NEWS_SYNC_VERSION,
      updatedAt: new Date(),
      updatedBy: authContext.uid,
    });
    return {
      status: 'synced',
      autoLinked,
      importedMedia: sync.imported,
      skippedMedia: sync.skipped,
      errors: [],
    };
  } catch (error) {
    return {
      status: 'error',
      autoLinked,
      importedMedia: 0,
      skippedMedia: 0,
      errors: [error instanceof Error ? error.message : 'Falha desconhecida na reconciliação.'],
    };
  }
}

/**
 * Mantém a cadeia Notícia → Evento → ArchiveItem → ArchiveMedia convergente.
 * Executada como backfill/auto-reparo para notícias antigas. Não cria Eventos.
 */
export async function reconcilePublishedNewsArchive(
  container: ServerContainer,
  authContext: AuthContext,
): Promise<NewsArchiveReconciliationReport> {
  const [events, newsItems] = await Promise.all([
    loadAllEvents(container, authContext.tenantId),
    loadPublishedNews(container, authContext.tenantId),
  ]);
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

  for (const news of newsItems) {
    report.scanned += 1;
    const item = await reconcileOnePublishedNewsArchive(container, authContext, news, events);
    if (item.autoLinked) report.autoLinked += 1;
    report.importedMedia += item.importedMedia;
    report.skippedMedia += item.skippedMedia;

    if (item.status === 'already_synced') report.alreadySynced += 1;
    else if (item.status === 'synced') report.synced += 1;
    else if (item.status === 'unresolved') report.unresolved += 1;
    else {
      report.errors.push({
        newsId: news.id,
        titulo: news.titulo,
        message: item.errors.join(' ') || 'Falha desconhecida na reconciliação.',
      });
    }
  }

  return report;
}
