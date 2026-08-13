import type { PageRequest, PageResult } from '../../../shared/pagination';
import type { Event } from '../entities/event.entity';

export interface IEventRepository {
  findById(id: string): Promise<Event | null>;
  listUpcoming(tenantId: string, from: Date, page: PageRequest): Promise<PageResult<Event>>;
  listAll(tenantId: string, page: PageRequest): Promise<PageResult<Event>>;
  /** Total de eventos futuros a partir de `from` — usado pelo Painel administrativo. */
  countUpcomingByTenant(tenantId: string, from: Date): Promise<number>;
  create(event: Event): Promise<void>;
  update(event: Event): Promise<void>;
}
