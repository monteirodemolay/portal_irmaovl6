import type { EventKind } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ConflictError, ok, err, type Result } from '../../../shared/result';
import type { Event } from '../entities/event.entity';
import type { IEventRepository } from '../repositories/event.repository';

export interface CreateEventInput {
  tipo: EventKind;
  titulo: string;
  descricao: string | null;
  local: string;
  dataInicio: Date;
  dataFim: Date;
  exigeConfirmacaoPresenca: boolean;
  capacidadeMaxima: number | null;
  traje: string | null;
  chegadaSugerida: string | null;
  observacoes: string | null;
  arquivosRelacionados: string[];
}

export interface CreateEventDeps {
  eventRepository: IEventRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

/** `dataFim` deve ser posterior a `dataInicio` — docs/architecture/06 §6.4. */
export class CreateEventUseCase {
  constructor(private readonly deps: CreateEventDeps) {}

  async execute(ctx: AuthContext, input: CreateEventInput): Promise<Result<Event>> {
    requirePermission(ctx, 'event:create');

    if (input.dataFim <= input.dataInicio) {
      return err(new ConflictError('A data final deve ser posterior à data inicial.'));
    }

    const now = this.deps.clock.now();
    const event: Event = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      ...input,
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
