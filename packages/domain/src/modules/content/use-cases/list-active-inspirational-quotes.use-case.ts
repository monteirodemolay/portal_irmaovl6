import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { InspirationalQuote } from '../entities/inspirational-quote.entity';
import type { IInspirationalQuoteRepository } from '../repositories/inspirational-quote.repository';

export interface ListActiveInspirationalQuotesDeps {
  quoteRepository: IInspirationalQuoteRepository;
}

/** Pool elegível para a rotação da "frase do dia" no Início. */
export class ListActiveInspirationalQuotesUseCase {
  constructor(private readonly deps: ListActiveInspirationalQuotesDeps) {}

  async execute(ctx: AuthContext): Promise<InspirationalQuote[]> {
    requirePermission(ctx, 'quote:read');
    return this.deps.quoteRepository.listActive(ctx.tenantId);
  }
}
