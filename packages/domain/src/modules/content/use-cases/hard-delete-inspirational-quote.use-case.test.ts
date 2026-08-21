import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { InMemoryInspirationalQuoteRepository } from '../../../test/fakes';
import type { InspirationalQuote } from '../entities/inspirational-quote.entity';
import { HardDeleteInspirationalQuoteUseCase } from './hard-delete-inspirational-quote.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['quote:manage'],
};

function buildQuote(overrides: Partial<InspirationalQuote> = {}): InspirationalQuote {
  return {
    id: 'frase-1',
    tenantId: 't1',
    texto: 'Texto',
    autor: 'Autor',
    ativa: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: new Date('2026-02-01'),
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

describe('HardDeleteInspirationalQuoteUseCase', () => {
  it('remove o documento de vez', async () => {
    const quoteRepository = new InMemoryInspirationalQuoteRepository();
    await quoteRepository.create(buildQuote());
    const useCase = new HardDeleteInspirationalQuoteUseCase({ quoteRepository });

    const result = await useCase.execute(ctx, 'frase-1');

    expect(result.ok).toBe(true);
    expect(await quoteRepository.findById('frase-1')).toBeNull();
  });
});
