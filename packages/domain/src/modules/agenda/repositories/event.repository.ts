import type { PageRequest, PageResult } from '../../../shared/pagination';
import type { Event } from '../entities/event.entity';

export interface IEventRepository {
  findById(id: string): Promise<Event | null>;
  listUpcoming(tenantId: string, from: Date, page: PageRequest): Promise<PageResult<Event>>;
  listAll(tenantId: string, page: PageRequest): Promise<PageResult<Event>>;
  /** Janela de datas arbitrária (ex.: navegação de mês em "Minha Agenda") — sem paginação por cursor. */
  listInRange(tenantId: string, from: Date, to: Date): Promise<Event[]>;
  /** Total de eventos futuros a partir de `from` — usado pelo Painel administrativo. */
  countUpcomingByTenant(tenantId: string, from: Date): Promise<number>;
  /** Aba "Concluídos" do admin — eventos passados OU excluídos, mais novo primeiro. */
  listConcluded(tenantId: string, page: PageRequest, at?: Date): Promise<PageResult<Event>>;
  create(event: Event): Promise<void>;
  update(event: Event): Promise<void>;
  /** Exclusão física — nunca chamado sem o item já ter passado por soft delete. */
  hardDelete(id: string): Promise<void>;
}
