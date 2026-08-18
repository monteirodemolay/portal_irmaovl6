import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryInspirationalQuoteRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { CreateInspirationalQuoteUseCase } from './create-inspirational-quote.use-case';

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

function buildUseCase() {
  const quoteRepository = new InMemoryInspirationalQuoteRepository();
  const useCase = new CreateInspirationalQuoteUseCase({
    quoteRepository,
    clock: new FixedClock(new Date('2026-03-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, quoteRepository };
}

describe('CreateInspirationalQuoteUseCase', () => {
  it('cria a frase já ativa por padrão', async () => {
    const { useCase, quoteRepository } = buildUseCase();

    const result = await useCase.execute(ctx, { texto: 'Só sei que nada sei.', autor: 'Sócrates' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.ativa).toBe(true);
    expect(result.value.tenantId).toBe('t1');

    const activeQuotes = await quoteRepository.listActive('t1');
    expect(activeQuotes).toHaveLength(1);
  });

  it('lança ForbiddenError sem a permissão quote:create', async () => {
    const { useCase } = buildUseCase();

    await expect(
      useCase.execute(ctxSemPermissao, { texto: 'Só sei que nada sei.', autor: 'Sócrates' }),
    ).rejects.toThrow(ForbiddenError);
  });
});
