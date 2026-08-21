import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { InMemoryInspirationalQuoteRepository } from '../../../test/fakes';
import type { InspirationalQuote } from '../entities/inspirational-quote.entity';
import { ListConcludedInspirationalQuotesUseCase } from './list-concluded-inspirational-quotes.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['quote:read'],
};

function buildQuote(overrides: Partial<InspirationalQuote> = {}): InspirationalQuote {
  return {
    id: 'frase-1',
    tenantId: 't1',
    texto: 'Texto',
    autor: 'Autor',
    ativa: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

describe('ListConcludedInspirationalQuotesUseCase', () => {
  it('inclui inativas e excluídas, mas não as ativas', async () => {
    const quoteRepository = new InMemoryInspirationalQuoteRepository();
    await quoteRepository.create(buildQuote({ id: 'inativa', ativa: false }));
    await quoteRepository.create(buildQuote({ id: 'excluida', deletedAt: new Date('2026-01-20') }));
    await quoteRepository.create(buildQuote({ id: 'ativa' }));
    const useCase = new ListConcludedInspirationalQuotesUseCase({ quoteRepository });

    const result = await useCase.execute(ctx, { limit: 20 });

    expect(result.items.map((q) => q.id).sort()).toEqual(['excluida', 'inativa']);
  });
});
