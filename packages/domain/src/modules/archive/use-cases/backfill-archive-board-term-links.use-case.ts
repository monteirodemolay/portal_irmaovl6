import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { IEventRepository } from '../../agenda/repositories/event.repository';
import type { IBoardTermRepository } from '../../governance/repositories/board-term.repository';
import type { IArchiveItemRepository } from '../repositories/archive-item.repository';

export interface BackfillArchiveBoardTermLinksDeps {
  eventRepository: IEventRepository;
  archiveItemRepository: IArchiveItemRepository;
  boardTermRepository: IBoardTermRepository;
  clock: IClock;
}

export interface BackfillArchiveBoardTermLinksResult {
  eventosVerificados: number;
  eventosCorrigidos: number;
  itensVerificados: number;
  itensCorrigidos: number;
}

/**
 * Resolve de novo `Event.boardTermId`/`ArchiveItem.boardTermId` de quem
 * ficou com `null` — acontece quando o Evento/item foi criado numa data
 * pra qual ainda não existia nenhuma Gestão cadastrada (`IBoardTermRepository
 * .findByDate` retornava `null` na hora, ver `CreateInitiationArchiveItemUseCase`
 * e irmãos de Elevação/Exaltação). É exatamente o caso de a Loja registrar
 * a data de iniciação de um Irmão antes de o Administrador ter cadastrado a
 * Gestão do ano corrente no Portal — o vínculo nunca é recalculado sozinho
 * depois, então "Iniciados nesta Gestão" (`/acervo/gestoes/[gestaoId]`)
 * nunca mostra esse Irmão, mesmo a Gestão certa já existindo.
 *
 * `ArchiveItem` não guarda a própria data — herda a do `Event` vinculado
 * (`eventId`), por isso os Eventos são corrigidos primeiro e reaproveitados
 * como cache pra não repetir a mesma busca. Só mexe em quem está com
 * `boardTermId: null` — nunca sobrescreve um vínculo já preenchido, mesmo
 * que pareça errado (evita substituir uma correção manual feita por fora
 * deste fluxo). Seguro rodar de novo: idempotente.
 */
export class BackfillArchiveBoardTermLinksUseCase {
  constructor(private readonly deps: BackfillArchiveBoardTermLinksDeps) {}

  async execute(ctx: AuthContext): Promise<Result<BackfillArchiveBoardTermLinksResult>> {
    requirePermission(ctx, 'boardTerm:manage');

    const now = this.deps.clock.now();
    const eventDateById = new Map<string, Date>();

    let eventosVerificados = 0;
    let eventosCorrigidos = 0;
    let eventCursor: string | undefined;
    for (;;) {
      const page = await this.deps.eventRepository.listAll(ctx.tenantId, {
        limit: 100,
        cursor: eventCursor,
      });
      for (const event of page.items) {
        eventosVerificados += 1;
        eventDateById.set(event.id, event.dataInicio);
        if (event.boardTermId === null) {
          const term = await this.deps.boardTermRepository.findByDate(
            ctx.tenantId,
            event.dataInicio,
          );
          if (term) {
            await this.deps.eventRepository.update({
              ...event,
              boardTermId: term.id,
              updatedAt: now,
              updatedBy: ctx.uid,
            });
            eventosCorrigidos += 1;
          }
        }
      }
      if (!page.hasMore || !page.nextCursor) break;
      eventCursor = page.nextCursor;
    }

    let itensVerificados = 0;
    let itensCorrigidos = 0;
    let itemCursor: string | undefined;
    for (;;) {
      const page = await this.deps.archiveItemRepository.findByTenant(ctx.tenantId, {
        limit: 100,
        cursor: itemCursor,
      });
      for (const item of page.items) {
        itensVerificados += 1;
        if (item.boardTermId === null) {
          let eventDate = eventDateById.get(item.eventId);
          if (!eventDate) {
            const event = await this.deps.eventRepository.findById(item.eventId);
            if (!event) continue;
            eventDate = event.dataInicio;
            eventDateById.set(event.id, eventDate);
          }
          const term = await this.deps.boardTermRepository.findByDate(ctx.tenantId, eventDate);
          if (term) {
            await this.deps.archiveItemRepository.update({
              ...item,
              boardTermId: term.id,
              updatedAt: now,
              updatedBy: ctx.uid,
            });
            itensCorrigidos += 1;
          }
        }
      }
      if (!page.hasMore || !page.nextCursor) break;
      itemCursor = page.nextCursor;
    }

    return ok({ eventosVerificados, eventosCorrigidos, itensVerificados, itensCorrigidos });
  }
}
