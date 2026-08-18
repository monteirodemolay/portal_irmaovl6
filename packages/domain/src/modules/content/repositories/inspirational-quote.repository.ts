import type { InspirationalQuote } from '../entities/inspirational-quote.entity';

export interface IInspirationalQuoteRepository {
  findById(id: string): Promise<InspirationalQuote | null>;
  /** Listagem administrativa (inclui inativas). */
  listAll(tenantId: string): Promise<InspirationalQuote[]>;
  /** Pool elegível para rotação no Início. */
  listActive(tenantId: string): Promise<InspirationalQuote[]>;
  create(quote: InspirationalQuote): Promise<void>;
  update(quote: InspirationalQuote): Promise<void>;
}
