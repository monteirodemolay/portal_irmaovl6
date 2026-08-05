import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryBoardTermRepository,
  InMemoryCommitteeRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { BoardTerm } from '../entities/board-term.entity';
import { CreateCommitteeUseCase } from './create-committee.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['committee:manage'],
};

const readOnlyCtx: AuthContext = {
  uid: 'user-1',
  tenantId: 't1',
  roleId: 'r2',
  permissions: ['committee:read'],
};

const term: BoardTerm = {
  id: 'term-1',
  tenantId: 't1',
  nome: 'Gestão 2026/2027',
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

function buildUseCase() {
  const committeeRepository = new InMemoryCommitteeRepository();
  const boardTermRepository = new InMemoryBoardTermRepository();
  const useCase = new CreateCommitteeUseCase({
    committeeRepository,
    boardTermRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, committeeRepository, boardTermRepository };
}

describe('CreateCommitteeUseCase', () => {
  it('cria uma comissão vinculada a uma gestão existente', async () => {
    const { useCase, committeeRepository, boardTermRepository } = buildUseCase();
    await boardTermRepository.create(term);

    const result = await useCase.execute(ctx, {
      gestaoId: 'term-1',
      nome: 'Comissão de Finanças',
      descricao: null,
      membrosIds: ['m1', 'm2'],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBe('id-1');
    expect(result.value.gestaoId).toBe('term-1');
    expect(result.value.membrosIds).toEqual(['m1', 'm2']);

    const stored = await committeeRepository.findById('id-1');
    expect(stored).not.toBeNull();
  });

  it('lança ForbiddenError quando falta a permissão committee:manage', async () => {
    const { useCase, boardTermRepository } = buildUseCase();
    await boardTermRepository.create(term);

    await expect(
      useCase.execute(readOnlyCtx, {
        gestaoId: 'term-1',
        nome: 'Comissão de Finanças',
        descricao: null,
        membrosIds: [],
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('retorna NotFoundError quando a gestão não existe no tenant', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, {
      gestaoId: 'inexistente',
      nome: 'Comissão de Finanças',
      descricao: null,
      membrosIds: [],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });
});
