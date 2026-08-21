import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { NotFoundError } from '../../../shared/result';
import { FixedClock, InMemoryInspirationalQuoteRepository } from '../../../test/fakes';
import type { InspirationalQuote } from '../entities/inspirational-quote.entity';
import { DeleteInspirationalQuoteUseCase } from './delete-inspirational-quote.use-case';

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

describe('DeleteInspirationalQuoteUseCase', () => {
  it('marca deletedAt sem apagar o documento', async () => {
    const quoteRepository = new InMemoryInspirationalQuoteRepository();
    await quoteRepository.create(buildQuote());
    const useCase = new DeleteInspirationalQuoteUseCase({
      quoteRepository,
      clock: new FixedClock(new Date('2026-03-01')),
    });

    const result = await useCase.execute(ctx, 'frase-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.deletedAt).toEqual(new Date('2026-03-01'));
    expect(await quoteRepository.findById('frase-1')).not.toBeNull();
  });

  it('retorna NotFoundError quando a frase não existe no tenant', async () => {
    const quoteRepository = new InMemoryInspirationalQuoteRepository();
    const useCase = new DeleteInspirationalQuoteUseCase({
      quoteRepository,
      clock: new FixedClock(),
    });

    const result = await useCase.execute(ctx, 'inexistente');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });
});
