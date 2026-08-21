import type { PageRequest, PageResult } from '../../../shared/pagination';
import type { InspirationalQuote } from '../entities/inspirational-quote.entity';

export interface IInspirationalQuoteRepository {
  findById(id: string): Promise<InspirationalQuote | null>;
  /** Listagem administrativa (inclui inativas). */
  listAll(tenantId: string): Promise<InspirationalQuote[]>;
  /** Pool elegível para rotação no Início. */
  listActive(tenantId: string): Promise<InspirationalQuote[]>;
  /** Aba "Concluídos" do admin — inativas OU excluídas, mais nova primeiro. */
  listConcluded(tenantId: string, page: PageRequest): Promise<PageResult<InspirationalQuote>>;
  create(quote: InspirationalQuote): Promise<void>;
  update(quote: InspirationalQuote): Promise<void>;
  /** Exclusão física — nunca chamado sem o item já ter passado por soft delete. */
  hardDelete(id: string): Promise<void>;
}
