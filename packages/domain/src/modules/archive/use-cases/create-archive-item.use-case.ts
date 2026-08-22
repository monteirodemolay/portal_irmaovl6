import type { ArchiveItemFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { IEventRepository } from '../../agenda/repositories/event.repository';
import type { IBoardTermRepository } from '../../governance/repositories/board-term.repository';
import type { ArchiveItem } from '../entities/archive-item.entity';
import type { IArchiveItemRepository } from '../repositories/archive-item.repository';

export interface CreateArchiveItemDeps {
  archiveItemRepository: IArchiveItemRepository;
  eventRepository: IEventRepository;
  boardTermRepository: IBoardTermRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/**
 * Cria um `ArchiveItem` — Fase 1 da Fundação do Acervo VL6
 * (docs/architecture/11-acervo-vl6.md §11.5).
 *
 * Regra de negócio central: todo item exige um `eventId` de um evento
 * existente do mesmo tenant — rejeita com `NotFoundError` se o evento não
 * existir ou pertencer a outro tenant, nunca cria item "solto".
 *
 * Quando `input.boardTermId` não é informado, identifica automaticamente a
 * Gestão vigente na data de início do evento (`IBoardTermRepository
 * .findByDate`). Se nenhuma Gestão cobrir a data, `boardTermId` fica
 * `null` e o item ainda é criado como rascunho (`publicacaoStatus:
 * 'rascunho'`) — decisão de projeto mais segura que bloquear a criação:
 * bloqueia a publicação definitiva (fase futura, ao implementar o caso de
 * uso de publicação), nunca o rascunho.
 */
export class CreateArchiveItemUseCase {
  constructor(private readonly deps: CreateArchiveItemDeps) {}

  async execute(ctx: AuthContext, input: ArchiveItemFormValues): Promise<Result<ArchiveItem>> {
    requirePermission(ctx, 'archiveItem:create');

    const event = await this.deps.eventRepository.findById(input.eventId);
    if (!event || event.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('Event', input.eventId));
    }

    const boardTermId =
      input.boardTermId ??
      (await this.deps.boardTermRepository.findByDate(ctx.tenantId, event.dataInicio))?.id ??
      null;

    const now = this.deps.clock.now();
    const item: ArchiveItem = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      eventId: input.eventId,
      boardTermId,
      titulo: input.titulo,
      tipo: input.tipo,
      descricao: input.descricao,
      nivelAcesso: input.nivelAcesso,
      publicacaoStatus: 'rascunho',
      capaMediaId: null,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'draft',
      ativo: true,
    };
    await this.deps.archiveItemRepository.create(item);

    return ok(item);
  }
}
