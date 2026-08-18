import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { InspirationalQuote } from '../entities/inspirational-quote.entity';
import type { IInspirationalQuoteRepository } from '../repositories/inspirational-quote.repository';

export interface ListAllInspirationalQuotesDeps {
  quoteRepository: IInspirationalQuoteRepository;
}

/** Listagem administrativa (inclui inativas) — requer `quote:read`. */
export class ListAllInspirationalQuotesUseCase {
  constructor(private readonly deps: ListAllInspirationalQuotesDeps) {}

  async execute(ctx: AuthContext): Promise<InspirationalQuote[]> {
    requirePermission(ctx, 'quote:read');
    return this.deps.quoteRepository.listAll(ctx.tenantId);
  }
}
