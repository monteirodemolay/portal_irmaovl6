import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { PageRequest, PageResult } from '../../../shared/pagination';
import type { InspirationalQuote } from '../entities/inspirational-quote.entity';
import type { IInspirationalQuoteRepository } from '../repositories/inspirational-quote.repository';

export interface ListConcludedInspirationalQuotesDeps {
  quoteRepository: IInspirationalQuoteRepository;
}

/** Frases inativas ou excluídas — fora da aba principal, mantidas só como registro. */
export class ListConcludedInspirationalQuotesUseCase {
  constructor(private readonly deps: ListConcludedInspirationalQuotesDeps) {}

  async execute(ctx: AuthContext, page: PageRequest): Promise<PageResult<InspirationalQuote>> {
    requirePermission(ctx, 'quote:read');
    return this.deps.quoteRepository.listConcluded(ctx.tenantId, page);
  }
}
