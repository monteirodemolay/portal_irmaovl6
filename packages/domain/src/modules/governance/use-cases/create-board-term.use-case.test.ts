import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryBoardTermRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import type { BoardTerm } from '../entities/board-term.entity';
import { CreateBoardTermUseCase } from './create-board-term.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['boardTerm:manage'],
};

const readOnlyCtx: AuthContext = {
  uid: 'user-1',
  tenantId: 't1',
  roleId: 'r2',
  permissions: ['boardTerm:read'],
};

const existingTerm: BoardTerm = {
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
  const useCase = new CreateBoardTermUseCase({
    boardTermRepository,
    clock: new FixedClock(new Date('2026-06-01T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, boardTermRepository };
}

describe('CreateBoardTermUseCase', () => {
  it('cria uma gestão anual com período válido', async () => {
    const { useCase, boardTermRepository } = buildUseCase();

    const result = await useCase.execute(ctx, {
      nome: 'Gestão 2026/2027',
      periodoInicio: new Date('2026-01-01'),
      periodoFim: new Date('2026-12-31'),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBe('id-1');
    expect(result.value.nome).toBe('Gestão 2026/2027');

    const stored = await boardTermRepository.findById('id-1');
    expect(stored).not.toBeNull();
  });

  it('lança ForbiddenError quando falta a permissão boardTerm:manage', async () => {
    const { useCase } = buildUseCase();

    await expect(
      useCase.execute(readOnlyCtx, {
        nome: 'Gestão 2026/2027',
        periodoInicio: new Date('2026-01-01'),
        periodoFim: new Date('2026-12-31'),
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('rejeita período final anterior ou igual ao inicial', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, {
      nome: 'Gestão inválida',
      periodoInicio: new Date('2026-12-31'),
      periodoFim: new Date('2026-01-01'),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('conflict');
  });

  it('rejeita período que se sobrepõe a uma gestão existente', async () => {
    const { useCase, boardTermRepository } = buildUseCase();
    await boardTermRepository.create(existingTerm);

    const result = await useCase.execute(ctx, {
      nome: 'Gestão sobreposta',
      periodoInicio: new Date('2025-06-01'),
      periodoFim: new Date('2026-06-01'),
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('conflict');
  });
});
