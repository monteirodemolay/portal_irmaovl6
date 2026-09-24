import 'server-only';

import type {
  ArchiveItem,
  ArchiveMedia,
  AuthContext,
  Event,
  Role,
} from '@vl6/domain';
import type { ServerContainer } from '@vl6/infra';
import { ARCHIVE_ITEM_TYPE_LABELS, BRAZIL_TIME_ZONE } from '@vl6/shared';
import { isAccessLevelVisible } from './access-level-visibility';
import type {
  ConstellationMemory,
  MemoryConstellationBundle,
} from './constellation-memory.types';

const PAGE_SIZE = 500;
const MAX_EVENTS = 3000;
const MAX_ITEMS = 5000;
const MAX_MEDIA = 10000;
const MAX_MEMORIES_RETURNED = 160;
const MAX_PHOTOS_PER_MEMORY = 18;

function formatMemoryDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: BRAZIL_TIME_ZONE,
  }).format(date);
}

function buildYearRange(year: number): { from: Date; to: Date } {
  return {
    from: new Date(`${year}-01-01T00:00:00-03:00`),
    to: new Date(`${year}-12-31T23:59:59.999-03:00`),
  };
}

async function loadEvents(
  container: ServerContainer,
  tenantId: string,
  year?: number,
): Promise<Event[]> {
  if (year) {
    const range = buildYearRange(year);
    return container.repositories.event.listInRange(tenantId, range.from, range.to);
  }

  const events: Event[] = [];
  let cursor: string | undefined;

  while (events.length < MAX_EVENTS) {
    const page = await container.repositories.event.listAll(tenantId, {
      limit: Math.min(PAGE_SIZE, MAX_EVENTS - events.length),
      ...(cursor ? { cursor } : {}),
    });
    events.push(...page.items);
    if (!page.hasMore || !page.nextCursor) break;
    cursor = page.nextCursor;
  }

  return events;
}

async function loadArchiveItems(
  container: ServerContainer,
  tenantId: string,
): Promise<ArchiveItem[]> {
  const items: ArchiveItem[] = [];
  let cursor: string | undefined;

  while (items.length < MAX_ITEMS) {
    const page = await container.repositories.archiveItem.findByTenant(tenantId, {
      limit: Math.min(PAGE_SIZE, MAX_ITEMS - items.length),
      ...(cursor ? { cursor } : {}),
    });
    items.push(...page.items);
    if (!page.hasMore || !page.nextCursor) break;
    cursor = page.nextCursor;
  }

  return items;
}

async function loadArchiveMedia(
  container: ServerContainer,
  tenantId: string,
): Promise<ArchiveMedia[]> {
  const media: ArchiveMedia[] = [];
  let cursor: string | undefined;

  while (media.length < MAX_MEDIA) {
    const page = await container.repositories.archiveMedia.findByTenant(tenantId, {
      limit: Math.min(PAGE_SIZE, MAX_MEDIA - media.length),
      ...(cursor ? { cursor } : {}),
    });
    media.push(...page.items);
    if (!page.hasMore || !page.nextCursor) break;
    cursor = page.nextCursor;
  }

  return media;
}

function interleaveByYear(memories: ConstellationMemory[]): ConstellationMemory[] {
  const groups = new Map<number, ConstellationMemory[]>();

  for (const memory of memories) {
    const group = groups.get(memory.year) ?? [];
    group.push(memory);
    groups.set(memory.year, group);
  }

  const years = [...groups.keys()].sort((a, b) => b - a);
  const positions = new Map(years.map((year) => [year, 0]));
  const result: ConstellationMemory[] = [];

  while (result.length < memories.length) {
    let added = false;
    for (const year of years) {
      const group = groups.get(year) ?? [];
      const position = positions.get(year) ?? 0;
      const memory = group[position];
      if (!memory) continue;
      result.push(memory);
      positions.set(year, position + 1);
      added = true;
    }
    if (!added) break;
  }

  return result;
}

/**
 * Monta a Central de Memória da Constelação sem persistir nenhuma relação
 * nova. Evento, Gestão, itens, mídias e pessoas identificadas são unidos a
 * partir dos IDs canônicos já existentes no Acervo. A ordenação geral
 * intercala anos para impedir que o volume de registros recentes esconda a
 * memória histórica.
 */
export async function loadConstellationMemories(
  authContext: AuthContext,
  role: Role | null,
  container: ServerContainer,
  options: { year?: number } = {},
): Promise<MemoryConstellationBundle> {
  const visibility = { authenticated: true, role };

  const [events, boardTerms, items, allMedia] = await Promise.all([
    loadEvents(container, authContext.tenantId, options.year),
    container.repositories.boardTerm.listByTenant(authContext.tenantId),
    loadArchiveItems(container, authContext.tenantId),
    loadArchiveMedia(container, authContext.tenantId),
  ]);

  const visibleEvents = events.filter((event) =>
    isAccessLevelVisible(event.nivelAcesso, visibility),
  );
  const eventById = new Map(visibleEvents.map((event) => [event.id, event]));
  const termById = new Map(boardTerms.map((term) => [term.id, term]));

  const visibleItems = items.filter(
    (item) =>
      item.publicacaoStatus === 'publicado' &&
      eventById.has(item.eventId) &&
      isAccessLevelVisible(item.nivelAcesso, visibility),
  );

  const itemById = new Map(visibleItems.map((item) => [item.id, item]));
  const itemsByEvent = new Map<string, ArchiveItem[]>();

  for (const item of visibleItems) {
    const eventItems = itemsByEvent.get(item.eventId) ?? [];
    eventItems.push(item);
    itemsByEvent.set(item.eventId, eventItems);
  }

  const mediaByItem = new Map<string, ArchiveMedia[]>();
  for (const media of allMedia) {
    if (
      media.publicacaoStatus !== 'publicado' ||
      !itemById.has(media.archiveItemId) ||
      !isAccessLevelVisible(media.accessLevel, visibility)
    ) {
      continue;
    }
    const itemMedia = mediaByItem.get(media.archiveItemId) ?? [];
    itemMedia.push(media);
    mediaByItem.set(media.archiveItemId, itemMedia);
  }

  const memories: ConstellationMemory[] = [];

  for (const event of visibleEvents) {
    const linkedItems = itemsByEvent.get(event.id) ?? [];
    if (linkedItems.length === 0) continue;

    const linkedMedia = linkedItems.flatMap((item) => mediaByItem.get(item.id) ?? []);
    const photos = linkedMedia
      .filter((media) => media.mediaType === 'foto')
      .sort((a, b) => a.order - b.order);
    const peopleIds = new Set(
      linkedMedia.flatMap((media) => media.pessoasIdentificadas ?? []),
    );
    const boardTermId =
      event.boardTermId ?? linkedItems.find((item) => item.boardTermId)?.boardTermId ?? null;
    const boardTerm = boardTermId ? termById.get(boardTermId) : null;
    const kindLabels = [
      ...new Set(
        linkedItems.map(
          (item) => ARCHIVE_ITEM_TYPE_LABELS[item.tipo] ?? 'Registro do Acervo',
        ),
      ),
    ];
    const primaryItem = linkedItems[0];
    const description =
      linkedItems.find((item) => item.descricao)?.descricao ?? event.descricao ?? null;
    const archiveTitle =
      primaryItem && primaryItem.titulo.trim() !== event.titulo.trim()
        ? primaryItem.titulo
        : null;
    const year = Number(
      new Intl.DateTimeFormat('en', {
        year: 'numeric',
        timeZone: BRAZIL_TIME_ZONE,
      }).format(event.dataInicio),
    );

    memories.push({
      id: `event:${event.id}`,
      eventId: event.id,
      title: event.titulo,
      archiveTitle,
      description,
      href: `/acervo/eventos/${event.id}`,
      year,
      dateIso: event.dataInicio.toISOString(),
      dateLabel: formatMemoryDate(event.dataInicio),
      location: event.local || null,
      boardTermId,
      boardTermName: boardTerm?.nome ?? null,
      kindLabels,
      media: photos.slice(0, MAX_PHOTOS_PER_MEMORY).map((media) => ({
        id: media.id,
        url: `/api/archive-media/${media.id}?track=0`,
        caption: media.caption,
        altText: media.altText,
      })),
      fallbackImageUrl: event.capaUrl ?? null,
      peopleCount: peopleIds.size,
      itemCount: linkedItems.length,
      mediaCount: linkedMedia.length,
      photoCount: photos.length,
    });
  }

  memories.sort((a, b) => b.dateIso.localeCompare(a.dateIso));

  const years = [...new Set(memories.map((memory) => memory.year))].sort((a, b) => b - a);
  const ordered = options.year ? memories : interleaveByYear(memories);
  const totalPhotos = memories.reduce((total, memory) => total + memory.photoCount, 0);

  return {
    memories: ordered.slice(0, MAX_MEMORIES_RETURNED),
    years,
    stats: {
      totalMemories: memories.length,
      totalPhotos,
      totalYears: years.length,
    },
  };
}
