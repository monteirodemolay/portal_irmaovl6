import type { ArchiveMediaTypeKey } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IArchiveItemRepository } from '../repositories/archive-item.repository';
import type { IArchiveMediaRepository } from '../repositories/archive-media.repository';

export type ArchiveMediaCounts = Record<ArchiveMediaTypeKey, number>;

export interface GetArchiveMediaCountsByEventDeps {
  archiveItemRepository: IArchiveItemRepository;
  archiveMediaRepository: IArchiveMediaRepository;
}

// Mesmo teto pragmático de `GetStorageUsageByBoardTermUseCase` — o acervo é
// pequeno o suficiente hoje para uma varredura completa em memória.
const SCAN_LIMIT = 5000;

/**
 * Conta fotos/vídeos/áudios/documentos já enviados por Evento (chave
 * `eventId`, não `archiveItemId` — o card do passo "Evento" da Central de
 * Publicação identifica o acontecimento pelo Evento da Agenda, nunca pelo
 * item do Acervo internamente). Reaproveita `findByTenant` de ambos os
 * repositórios sem paginação real (mesmo teto pragmático de
 * `GetStorageUsageByBoardTermUseCase`) — agrupamento e soma acontecem em
 * memória aqui, sem método novo nos repositórios nem consulta por Evento
 * (evitaria N+1 num tenant com milhares de Eventos na Agenda).
 */
export class GetArchiveMediaCountsByEventUseCase {
  constructor(private readonly deps: GetArchiveMediaCountsByEventDeps) {}

  async execute(ctx: AuthContext): Promise<Record<string, ArchiveMediaCounts>> {
    requirePermission(ctx, 'archiveItem:create');

    const [itemsPage, mediaPage] = await Promise.all([
      this.deps.archiveItemRepository.findByTenant(ctx.tenantId, { limit: SCAN_LIMIT }),
      this.deps.archiveMediaRepository.findByTenant(ctx.tenantId, { limit: SCAN_LIMIT }),
    ]);

    const eventIdByArchiveItemId = new Map<string, string>();
    for (const item of itemsPage.items) {
      eventIdByArchiveItemId.set(item.id, item.eventId);
    }

    const countsByEventId: Record<string, ArchiveMediaCounts> = {};
    for (const media of mediaPage.items) {
      const eventId = eventIdByArchiveItemId.get(media.archiveItemId);
      if (!eventId) continue;
      const counts = (countsByEventId[eventId] ??= { foto: 0, video: 0, audio: 0, documento: 0 });
      counts[media.mediaType] += 1;
    }

    return countsByEventId;
  }
}
