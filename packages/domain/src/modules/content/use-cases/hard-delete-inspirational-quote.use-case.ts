import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { IInspirationalQuoteRepository } from '../repositories/inspirational-quote.repository';

export interface HardDeleteInspirationalQuoteDeps {
  quoteRepository: IInspirationalQuoteRepository;
}

/** Exclusão física, irreversível — usada pra apagar registros de vez (ex.: cadastro por engano). */
export class HardDeleteInspirationalQuoteUseCase {
  constructor(private readonly deps: HardDeleteInspirationalQuoteDeps) {}

  async execute(ctx: AuthContext, quoteId: string): Promise<Result<void>> {
    requirePermission(ctx, 'quote:delete');

    const current = await this.deps.quoteRepository.findById(quoteId);
    if (!current || current.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('InspirationalQuote', quoteId));
    }

    await this.deps.quoteRepository.hardDelete(quoteId);
    return ok(undefined);
  }
}
