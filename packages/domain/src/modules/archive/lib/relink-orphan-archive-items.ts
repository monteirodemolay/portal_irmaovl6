import type { IClock } from '../../../shared/ports';
import type { IEventRepository } from '../../agenda/repositories/event.repository';
import type { BoardTerm } from '../../governance/entities/board-term.entity';
import type { IArchiveItemRepository } from '../repositories/archive-item.repository';

export interface RelinkOrphanArchiveItemsDeps {
  eventRepository: IEventRepository;
  archiveItemRepository: IArchiveItemRepository;
  clock: IClock;
}

export interface RelinkOrphanArchiveItemsResult {
  eventosCorrigidos: number;
  itensCorrigidos: number;
}

/**
 * Vincula à Gestão recém-criada/editada todo Evento e item do Acervo VL6
 * que caem dentro do período dela e ainda estão com `boardTermId: null` —
 * fecha automaticamente o buraco descrito em `BackfillArchiveBoardTermLinksUseCase`:
 * quando a data de iniciação/elevação/exaltação de um Irmão é registrada
 * ANTES de a Gestão do ano corrente existir no Portal, `findByDate` não
 * acha nada na hora e o vínculo fica órfão. Chamado de dentro de
 * `CreateBoardTermUseCase`/`UpdateBoardTermUseCase` logo depois da Gestão
 * ser gravada — dali em diante, cadastrar a Gestão em qualquer ordem
 * (antes ou depois das cerimônias) sempre resolve sozinho, sem precisar do
 * botão manual de correção em massa. Só o período desta Gestão é
 * verificado (não o tenant inteiro), então é barato o suficiente pra rodar
 * em toda criação/edição. Nunca sobrescreve um vínculo já preenchido, nem
 * aqui nem no botão manual.
 */
export async function relinkOrphanArchiveItems(
  deps: RelinkOrphanArchiveItemsDeps,
  tenantId: string,
  updatedBy: string,
  term: Pick<BoardTerm, 'id' | 'periodoInicio' | 'periodoFim'>,
): Promise<RelinkOrphanArchiveItemsResult> {
  const now = deps.clock.now();
  const eventsInRange = await deps.eventRepository.listInRange(
    tenantId,
    term.periodoInicio,
    term.periodoFim,
  );

  let eventosCorrigidos = 0;
  for (const event of eventsInRange) {
    if (event.boardTermId === null) {
      await deps.eventRepository.update({
        ...event,
        boardTermId: term.id,
        updatedAt: now,
        updatedBy,
      });
      eventosCorrigidos += 1;
    }
  }

  let itensCorrigidos = 0;
  for (const event of eventsInRange) {
    const items = await deps.archiveItemRepository.findByEventId(event.id);
    for (const item of items) {
      if (item.boardTermId === null) {
        await deps.archiveItemRepository.update({
          ...item,
          boardTermId: term.id,
          updatedAt: now,
          updatedBy,
        });
        itensCorrigidos += 1;
      }
    }
  }

  return { eventosCorrigidos, itensCorrigidos };
}
