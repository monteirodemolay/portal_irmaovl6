import type { AccessLevel, EventKind } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ConflictError, ok, err, type Result } from '../../../shared/result';
import type { IBoardTermRepository } from '../../governance/repositories/board-term.repository';
import type { Event } from '../entities/event.entity';
import type { IEventRepository } from '../repositories/event.repository';

export interface CreateEventInput {
  tipo: EventKind;
  titulo: string;
  descricao: string | null;
  local: string;
  dataInicio: Date;
  dataFim: Date | null;
  exigeConfirmacaoPresenca: boolean;
  capacidadeMaxima: number | null;
  traje: string | null;
  chegadaSugerida: string | null;
  observacoes: string | null;
  arquivosRelacionados: string[];
  boardTermId: string | null;
  nivelAcesso: AccessLevel;
  exibirNaLinhaDoTempo: boolean;
}

export interface CreateEventDeps {
  eventRepository: IEventRepository;
  boardTermRepository: IBoardTermRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/** `dataFim` deve ser posterior a `dataInicio` — docs/architecture/06 §6.4. */
export class CreateEventUseCase {
  constructor(private readonly deps: CreateEventDeps) {}

  async execute(ctx: AuthContext, input: CreateEventInput): Promise<Result<Event>> {
    requirePermission(ctx, 'event:create');

    if (input.dataFim && input.dataFim <= input.dataInicio) {
      return err(new ConflictError('A data final deve ser posterior à data inicial.'));
    }

    // A Gestão nunca é escolhida manualmente — é sempre derivada de
    // `dataInicio` contra o período de cada Gestão cadastrada, senão o
    // evento fica com `boardTermId` errado (ou nulo) e some do filtro por
    // Gestão em qualquer tela que dependa dele (Central de Publicação,
    // Constelação da Memória etc.).
    const boardTerm = await this.deps.boardTermRepository.findByDate(
      ctx.tenantId,
      input.dataInicio,
    );

    const now = this.deps.clock.now();
    const event: Event = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      ...input,
      boardTermId: boardTerm?.id ?? null,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.eventRepository.create(event);

    return ok(event);
  }
}
