import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { InMemoryInspirationalQuoteRepository } from '../../../test/fakes';
import type { InspirationalQuote } from '../entities/inspirational-quote.entity';
import { ListActiveInspirationalQuotesUseCase } from './list-active-inspirational-quotes.use-case';

const ctx: AuthContext = {
  uid: 'membro-1',
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

describe('ListActiveInspirationalQuotesUseCase', () => {
  it('retorna só as frases ativas do tenant', async () => {
    const quoteRepository = new InMemoryInspirationalQuoteRepository();
    await quoteRepository.create(buildQuote({ id: 'ativa', ativa: true }));
    await quoteRepository.create(buildQuote({ id: 'inativa', ativa: false }));
    await quoteRepository.create(buildQuote({ id: 'outro-tenant', tenantId: 't2', ativa: true }));
    const useCase = new ListActiveInspirationalQuotesUseCase({ quoteRepository });

    const result = await useCase.execute(ctx);

    expect(result.map((q) => q.id)).toEqual(['ativa']);
  });

  it('lança ForbiddenError sem a permissão quote:read', async () => {
    const quoteRepository = new InMemoryInspirationalQuoteRepository();
    const useCase = new ListActiveInspirationalQuotesUseCase({ quoteRepository });

    await expect(
      useCase.execute({ uid: 'x', tenantId: 't1', roleId: 'r1', permissions: [] }),
    ).rejects.toThrow(ForbiddenError);
  });
});
