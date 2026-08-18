import type { InspirationalQuoteFormValues } from '@vl6/shared';
import type { AuthContext } from '../../../shared/auth-context';
import { requirePermission } from '../../../shared/auth-context';
import type { IClock, IIdGenerator } from '../../../shared/ports';
import { ok, type Result } from '../../../shared/result';
import type { InspirationalQuote } from '../entities/inspirational-quote.entity';
import type { IInspirationalQuoteRepository } from '../repositories/inspirational-quote.repository';

export interface CreateInspirationalQuoteDeps {
  quoteRepository: IInspirationalQuoteRepository;
  clock: IClock;
  idGenerator: IIdGenerator;
}

export class CreateInspirationalQuoteUseCase {
  constructor(private readonly deps: CreateInspirationalQuoteDeps) {}

  async execute(
    ctx: AuthContext,
    input: InspirationalQuoteFormValues,
  ): Promise<Result<InspirationalQuote>> {
    requirePermission(ctx, 'quote:create');

    const now = this.deps.clock.now();
    const quote: InspirationalQuote = {
      id: this.deps.idGenerator.next(),
      tenantId: ctx.tenantId,
      ...input,
      ativa: true,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.uid,
      updatedBy: ctx.uid,
      deletedAt: null,
      status: 'active',
      ativo: true,
    };
    await this.deps.quoteRepository.create(quote);

    return ok(quote);
  }
}
