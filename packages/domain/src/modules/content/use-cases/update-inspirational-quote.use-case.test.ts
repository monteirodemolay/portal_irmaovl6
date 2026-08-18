import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError } from '../../../shared/result';
import { FixedClock, InMemoryInspirationalQuoteRepository } from '../../../test/fakes';
import type { InspirationalQuote } from '../entities/inspirational-quote.entity';
import { UpdateInspirationalQuoteUseCase } from './update-inspirational-quote.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['quote:manage'],
};

const ctxSemPermissao: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: [],
};

function buildQuote(overrides: Partial<InspirationalQuote> = {}): InspirationalQuote {
  return {
    id: 'frase-1',
    tenantId: 't1',
    texto: 'Texto original',
    autor: 'Autor original',
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

function buildUseCase() {
  const quoteRepository = new InMemoryInspirationalQuoteRepository();
  const useCase = new UpdateInspirationalQuoteUseCase({
    quoteRepository,
    clock: new FixedClock(new Date('2026-03-01T00:00:00Z')),
  });
  return { useCase, quoteRepository };
}

describe('UpdateInspirationalQuoteUseCase', () => {
  it('atualiza texto e autor mantendo o vínculo entre os dois', async () => {
    const { useCase, quoteRepository } = buildUseCase();
    await quoteRepository.create(buildQuote());

    const result = await useCase.execute(ctx, 'frase-1', {
      texto: 'Novo texto',
      autor: 'Novo autor',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.texto).toBe('Novo texto');
    expect(result.value.autor).toBe('Novo autor');
  });

  it('retorna NotFoundError quando a frase não existe no tenant', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, 'inexistente', {
      texto: 'Novo texto',
      autor: 'Novo autor',
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('lança ForbiddenError sem a permissão quote:update', async () => {
    const { useCase, quoteRepository } = buildUseCase();
    await quoteRepository.create(buildQuote());

    await expect(
      useCase.execute(ctxSemPermissao, 'frase-1', { texto: 'x', autor: 'y' }),
    ).rejects.toThrow(ForbiddenError);
  });
});
