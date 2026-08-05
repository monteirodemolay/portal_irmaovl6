import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { InMemoryBoardTermRepository } from '../../../test/fakes';
import type { BoardTerm } from '../entities/board-term.entity';
import { ListBoardTermsUseCase } from './list-board-terms.use-case';

const ctx: AuthContext = {
  uid: 'user-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['boardTerm:read'],
};

const forbiddenCtx: AuthContext = {
  uid: 'user-2',
  tenantId: 't1',
  roleId: 'r2',
  permissions: [],
};

function buildTerm(id: string, tenantId: string): BoardTerm {
  return {
    id,
    tenantId,
    nome: `Gestão ${id}`,
    periodoInicio: new Date('2026-01-01'),
    periodoFim: new Date('2026-12-31'),
    createdAt: new Date('2025-12-01'),
    updatedAt: new Date('2025-12-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
  };
}

function buildUseCase() {
  const boardTermRepository = new InMemoryBoardTermRepository();
  const useCase = new ListBoardTermsUseCase({ boardTermRepository });
  return { useCase, boardTermRepository };
}

describe('ListBoardTermsUseCase', () => {
  it('lista somente as gestões do tenant do contexto', async () => {
    const { useCase, boardTermRepository } = buildUseCase();
    await boardTermRepository.create(buildTerm('term-1', 't1'));
    await boardTermRepository.create(buildTerm('term-2', 't1'));
    await boardTermRepository.create(buildTerm('term-outro-tenant', 't2'));

    const terms = await useCase.execute(ctx);

    expect(terms).toHaveLength(2);
    expect(terms.map((t) => t.id).sort()).toEqual(['term-1', 'term-2']);
  });

  it('lança ForbiddenError quando falta a permissão boardTerm:read', async () => {
    const { useCase } = buildUseCase();

    await expect(useCase.execute(forbiddenCtx)).rejects.toThrow(ForbiddenError);
  });

  it('retorna lista vazia quando o tenant não tem gestões cadastradas', async () => {
    const { useCase } = buildUseCase();

    const terms = await useCase.execute(ctx);

    expect(terms).toEqual([]);
  });
});
