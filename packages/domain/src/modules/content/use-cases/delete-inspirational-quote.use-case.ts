import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { InspirationalQuote } from '../entities/inspirational-quote.entity';
import type { IInspirationalQuoteRepository } from '../repositories/inspirational-quote.repository';

export interface DeleteInspirationalQuoteDeps {
  quoteRepository: IInspirationalQuoteRepository;
  clock: IClock;
}

/** Exclusão lógica — seta `deletedAt`, nunca remove o documento (docs/architecture/03 §3.1). */
export class DeleteInspirationalQuoteUseCase {
  constructor(private readonly deps: DeleteInspirationalQuoteDeps) {}

  async execute(ctx: AuthContext, quoteId: string): Promise<Result<InspirationalQuote>> {
    requirePermission(ctx, 'quote:delete');

    const current = await this.deps.quoteRepository.findById(quoteId);
    if (!current || current.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('InspirationalQuote', quoteId));
    }

    const now = this.deps.clock.now();
    const updated: InspirationalQuote = {
      ...current,
      deletedAt: now,
      updatedAt: now,
      updatedBy: ctx.uid,
    };
    await this.deps.quoteRepository.update(updated);

    return ok(updated);
  }
}
