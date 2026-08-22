import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { InMemoryBoardTermRepository } from '../../../test/fakes';
import type { BoardTerm } from '../entities/board-term.entity';
import { FindBoardTermForDateUseCase } from './find-board-term-for-date.use-case';

const ctx: AuthContext = {
  uid: 'user-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['boardTerm:read'],
};

const term: BoardTerm = {
  id: 'term-1',
  tenantId: 't1',
  nome: 'Gestão 2025/2026',
  periodoInicio: new Date('2025-01-01'),
  periodoFim: new Date('2025-12-31'),
  createdAt: new Date('2024-12-01'),
  updatedAt: new Date('2024-12-01'),
  createdBy: 'admin-1',
  updatedBy: 'admin-1',
  deletedAt: null,
  status: 'active',
  ativo: true,
};

function buildUseCase() {
  const boardTermRepository = new InMemoryBoardTermRepository();
  const useCase = new FindBoardTermForDateUseCase({ boardTermRepository });
  return { useCase, boardTermRepository };
}

describe('FindBoardTermForDateUseCase', () => {
  it('retorna a gestão cujo período contém a data', async () => {
    const { useCase, boardTermRepository } = buildUseCase();
    await boardTermRepository.create(term);

    const result = await useCase.execute(ctx, new Date('2025-06-15'));

    expect(result?.id).toBe('term-1');
  });

  it('retorna null quando não há gestão cadastrada para a data', async () => {
    const { useCase, boardTermRepository } = buildUseCase();
    await boardTermRepository.create(term);

    const result = await useCase.execute(ctx, new Date('2030-01-01'));

    expect(result).toBeNull();
  });

  it('lança ForbiddenError quando falta a permissão boardTerm:read', async () => {
    const { useCase } = buildUseCase();

    await expect(
      useCase.execute({ ...ctx, permissions: [] }, new Date('2025-06-15')),
    ).rejects.toThrow(ForbiddenError);
  });

  it('isolamento de tenant: não retorna gestão de outro tenant', async () => {
    const { useCase, boardTermRepository } = buildUseCase();
    await boardTermRepository.create(term);

    const result = await useCase.execute({ ...ctx, tenantId: 't2' }, new Date('2025-06-15'));

    expect(result).toBeNull();
  });
});
