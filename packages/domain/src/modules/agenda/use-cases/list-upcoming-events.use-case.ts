import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import type { PageRequest, PageResult } from '../../../shared/pagination';
import type { Event } from '../entities/event.entity';
import type { IEventRepository } from '../repositories/event.repository';

export interface ListUpcomingEventsDeps {
  eventRepository: IEventRepository;
  clock: IClock;
}

/** Próximos eventos (dashboard do Irmão / site público) — requer `event:read`. */
export class ListUpcomingEventsUseCase {
  constructor(private readonly deps: ListUpcomingEventsDeps) {}

  async execute(ctx: AuthContext, page: PageRequest): Promise<PageResult<Event>> {
    requirePermission(ctx, 'event:read');
    return this.deps.eventRepository.listUpcoming(ctx.tenantId, this.deps.clock.now(), page);
  }
}

/** Listagem administrativa (inclui eventos passados) — requer `event:read`. */
export class ListAllEventsUseCase {
  constructor(private readonly deps: Pick<ListUpcomingEventsDeps, 'eventRepository'>) {}

  async execute(ctx: AuthContext, page: PageRequest): Promise<PageResult<Event>> {
    requirePermission(ctx, 'event:read');
    return this.deps.eventRepository.listAll(ctx.tenantId, page);
  }
}
