import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock } from '../../../shared/ports';
import { NotFoundError, ok, err, type Result } from '../../../shared/result';
import type { InspirationalQuote } from '../entities/inspirational-quote.entity';
import type { IInspirationalQuoteRepository } from '../repositories/inspirational-quote.repository';

export interface ToggleInspirationalQuoteActiveDeps {
  quoteRepository: IInspirationalQuoteRepository;
  clock: IClock;
}

/** Ativa/desativa uma frase no pool de rotação sem excluí-la. */
export class ToggleInspirationalQuoteActiveUseCase {
  constructor(private readonly deps: ToggleInspirationalQuoteActiveDeps) {}

  async execute(
    ctx: AuthContext,
    quoteId: string,
    ativa: boolean,
  ): Promise<Result<InspirationalQuote>> {
    requirePermission(ctx, 'quote:update');

    const current = await this.deps.quoteRepository.findById(quoteId);
    if (!current || current.tenantId !== ctx.tenantId) {
      return err(new NotFoundError('InspirationalQuote', quoteId));
    }

    const updated: InspirationalQuote = {
      ...current,
      ativa,
      updatedAt: this.deps.clock.now(),
      updatedBy: ctx.uid,
    };
    await this.deps.quoteRepository.update(updated);

    return ok(updated);
  }
}
