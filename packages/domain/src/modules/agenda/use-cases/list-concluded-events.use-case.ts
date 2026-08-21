import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import type { PageRequest, PageResult } from '../../../shared/pagination';
import type { Event } from '../entities/event.entity';
import type { IEventRepository } from '../repositories/event.repository';

export interface ListConcludedEventsDeps {
  eventRepository: IEventRepository;
  clock: IClock;
}

/** Eventos passados ou excluídos — fora da aba principal, mantidos só como registro. */
export class ListConcludedEventsUseCase {
  constructor(private readonly deps: ListConcludedEventsDeps) {}

  async execute(ctx: AuthContext, page: PageRequest): Promise<PageResult<Event>> {
    requirePermission(ctx, 'event:read');
    return this.deps.eventRepository.listConcluded(ctx.tenantId, page, this.deps.clock.now());
  }
}
