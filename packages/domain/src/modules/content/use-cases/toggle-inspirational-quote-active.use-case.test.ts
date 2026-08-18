import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { NotFoundError } from '../../../shared/result';
import { FixedClock, InMemoryInspirationalQuoteRepository } from '../../../test/fakes';
import type { InspirationalQuote } from '../entities/inspirational-quote.entity';
import { ToggleInspirationalQuoteActiveUseCase } from './toggle-inspirational-quote-active.use-case';

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

describe('ToggleInspirationalQuoteActiveUseCase', () => {
  it('desativa uma frase sem excluí-la', async () => {
    const quoteRepository = new InMemoryInspirationalQuoteRepository();
    await quoteRepository.create(buildQuote({ ativa: true }));
    const useCase = new ToggleInspirationalQuoteActiveUseCase({
      quoteRepository,
      clock: new FixedClock(),
    });

    const result = await useCase.execute(ctx, 'frase-1', false);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.ativa).toBe(false);
    expect(await quoteRepository.findById('frase-1')).not.toBeNull();
  });

  it('retorna NotFoundError quando a frase não existe no tenant', async () => {
    const quoteRepository = new InMemoryInspirationalQuoteRepository();
    const useCase = new ToggleInspirationalQuoteActiveUseCase({
      quoteRepository,
      clock: new FixedClock(),
    });

    const result = await useCase.execute(ctx, 'inexistente', false);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });
});
