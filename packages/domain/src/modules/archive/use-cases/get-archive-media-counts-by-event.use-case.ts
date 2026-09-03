import type { ArchiveMediaTypeKey } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { ArchiveItem } from '../entities/archive-item.entity';
import type { IArchiveItemRepository } from '../repositories/archive-item.repository';
import type { IArchiveMediaRepository } from '../repositories/archive-media.repository';

export type ArchiveMediaCounts = Record<ArchiveMediaTypeKey, number>;

export interface ArchiveEventPublishState {
  /** `ArchiveItem.id` a reabrir na Central de Publicação pra editar o que já existe pra este Evento. */
  archiveItemId: string;
  counts: ArchiveMediaCounts;
}

export interface GetArchiveMediaCountsByEventDeps {
  archiveItemRepository: IArchiveItemRepository;
  archiveMediaRepository: IArchiveMediaRepository;
}

// Mesmo teto pragmático de `GetStorageUsageByBoardTermUseCase` — o acervo é
// pequeno o suficiente hoje para uma varredura completa em memória.
const SCAN_LIMIT = 5000;

/**
 * Estado de publicação por Evento (chave `eventId`, não `archiveItemId` — o
 * card do passo "Evento" da Central de Publicação identifica o
 * acontecimento pelo Evento da Agenda, nunca pelo item do Acervo
 * internamente): contagem de fotos/vídeos/áudios/documentos já enviados e o
 * `archiveItemId` a reabrir pra editar, em vez de sempre criar um item novo
 * (bug corrigido — o passo "Evento" clicava direto num Evento com conteúdo
 * e criava um segundo `ArchiveItem` duplicado pro mesmo Evento). Quando um
 * Evento tem mais de um `ArchiveItem` (histórico anterior a esta correção),
 * escolhe o item com mais mídia enviada — empate resolvido pelo mais
 * recente — como "o que já foi feito" pra reabrir.
 *
 * Reaproveita `findByTenant` de ambos os repositórios sem paginação real
 * (mesmo teto pragmático de `GetStorageUsageByBoardTermUseCase`) —
 * agrupamento e soma acontecem em memória aqui, sem método novo nos
 * repositórios nem consulta por Evento (evitaria N+1 num tenant com
 * milhares de Eventos na Agenda).
 */
export class GetArchiveMediaCountsByEventUseCase {
  constructor(private readonly deps: GetArchiveMediaCountsByEventDeps) {}

  async execute(ctx: AuthContext): Promise<Record<string, ArchiveEventPublishState>> {
    requirePermission(ctx, 'archiveItem:create');

    const [itemsPage, mediaPage] = await Promise.all([
      this.deps.archiveItemRepository.findByTenant(ctx.tenantId, { limit: SCAN_LIMIT }),
      this.deps.archiveMediaRepository.findByTenant(ctx.tenantId, { limit: SCAN_LIMIT }),
    ]);

    const eventIdByArchiveItemId = new Map<string, string>();
    for (const item of itemsPage.items) {
      eventIdByArchiveItemId.set(item.id, item.eventId);
    }

    const mediaCountByArchiveItemId = new Map<string, number>();
    const countsByEventId: Record<string, ArchiveMediaCounts> = {};
    for (const media of mediaPage.items) {
      const eventId = eventIdByArchiveItemId.get(media.archiveItemId);
      if (!eventId) continue;
      const counts = (countsByEventId[eventId] ??= { foto: 0, video: 0, audio: 0, documento: 0 });
      counts[media.mediaType] += 1;
      mediaCountByArchiveItemId.set(
        media.archiveItemId,
        (mediaCountByArchiveItemId.get(media.archiveItemId) ?? 0) + 1,
      );
    }

    const bestItemByEventId = new Map<string, ArchiveItem>();
    for (const item of itemsPage.items) {
      const current = bestItemByEventId.get(item.eventId);
      if (!current) {
        bestItemByEventId.set(item.eventId, item);
        continue;
      }
      const currentMediaCount = mediaCountByArchiveItemId.get(current.id) ?? 0;
      const itemMediaCount = mediaCountByArchiveItemId.get(item.id) ?? 0;
      if (
        itemMediaCount > currentMediaCount ||
        (itemMediaCount === currentMediaCount &&
          item.createdAt.getTime() > current.createdAt.getTime())
      ) {
        bestItemByEventId.set(item.eventId, item);
      }
    }

    const result: Record<string, ArchiveEventPublishState> = {};
    for (const [eventId, item] of bestItemByEventId) {
      result[eventId] = {
        archiveItemId: item.id,
        counts: countsByEventId[eventId] ?? { foto: 0, video: 0, audio: 0, documento: 0 },
      };
    }
    return result;
  }
}
