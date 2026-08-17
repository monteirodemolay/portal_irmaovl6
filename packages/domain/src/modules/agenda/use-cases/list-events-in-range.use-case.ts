import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { Event } from '../entities/event.entity';
import type { IEventRepository } from '../repositories/event.repository';

export interface ListEventsInRangeDeps {
  eventRepository: IEventRepository;
}

export interface ListEventsInRangeInput {
  from: Date;
  to: Date;
}

/** Janela de datas arbitrária (navegação de mês/semana em "Minha Agenda") — requer `event:read`. */
export class ListEventsInRangeUseCase {
  constructor(private readonly deps: ListEventsInRangeDeps) {}

  async execute(ctx: AuthContext, input: ListEventsInRangeInput): Promise<Event[]> {
    requirePermission(ctx, 'event:read');
    return this.deps.eventRepository.listInRange(ctx.tenantId, input.from, input.to);
  }
}
