import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import {
  FixedClock,
  InMemoryBoardPositionAssignmentRepository,
  InMemoryMemberPositionHistoryRepository,
} from '../../../test/fakes';
import type { BoardPositionAssignment } from '../entities/board-position-assignment.entity';
import type { MemberPositionHistory } from '../../membership/entities/member-position-history.entity';
import { RenameBoardPositionCargoUseCase } from './rename-board-position-cargo.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['boardTerm:manage'],
};

const assignment: BoardPositionAssignment = {
  id: 'assignment-1',
  tenantId: 't1',
  gestaoId: 'term-1',
  cargo: 'Mestre de Cerimônicas Adjunto',
  memberId: 'm1',
  ordem: 1,
  createdAt: new Date('2026-06-01'),
  updatedAt: new Date('2026-06-01'),
  createdBy: 'admin-1',
  updatedBy: 'admin-1',
  deletedAt: null,
  status: 'active',
  ativo: true,
};

const activeHistory: MemberPositionHistory = {
  id: 'history-1',
  tenantId: 't1',
  memberId: 'm1',
  cargo: 'Mestre de Cerimônicas Adjunto',
  gestaoId: 'term-1',
  dataInicio: new Date('2026-06-01'),
  dataFim: null,
  observacoes: null,
  createdAt: new Date('2026-06-01'),
  updatedAt: new Date('2026-06-01'),
  createdBy: 'admin-1',
  updatedBy: 'admin-1',
  deletedAt: null,
  status: 'active',
  ativo: true,
};

function buildUseCase() {
  const assignmentRepository = new InMemoryBoardPositionAssignmentRepository();
  const positionHistoryRepository = new InMemoryMemberPositionHistoryRepository();
  const useCase = new RenameBoardPositionCargoUseCase({
    assignmentRepository,
    positionHistoryRepository,
    clock: new FixedClock(new Date('2026-09-01T00:00:00Z')),
  });
  return { useCase, assignmentRepository, positionHistoryRepository };
}

describe('RenameBoardPositionCargoUseCase', () => {
  it('corrige o nome do cargo na atribuição e no histórico ativo do mesmo titular', async () => {
    const { useCase, assignmentRepository, positionHistoryRepository } = buildUseCase();
    await assignmentRepository.create(assignment);
    await positionHistoryRepository.create(activeHistory);

    const result = await useCase.execute(ctx, {
      assignmentId: 'assignment-1',
      novoCargo: 'Mestre de Cerimônias Adjunto',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.cargo).toBe('Mestre de Cerimônias Adjunto');

    const stored = await assignmentRepository.findById('assignment-1');
    expect(stored?.cargo).toBe('Mestre de Cerimônias Adjunto');
    const history = await positionHistoryRepository.findActiveByMemberId('m1');
    expect(history?.cargo).toBe('Mestre de Cerimônias Adjunto');
  });

  it('não mexe no histórico de outra gestão/cargo', async () => {
    const { useCase, assignmentRepository, positionHistoryRepository } = buildUseCase();
    await assignmentRepository.create(assignment);
    await positionHistoryRepository.create({
      ...activeHistory,
      gestaoId: 'term-2',
    });

    await useCase.execute(ctx, {
      assignmentId: 'assignment-1',
      novoCargo: 'Mestre de Cerimônias Adjunto',
    });

    const history = await positionHistoryRepository.findActiveByMemberId('m1');
    expect(history?.cargo).toBe('Mestre de Cerimônicas Adjunto');
  });

  it('rejeita nome vazio', async () => {
    const { useCase, assignmentRepository } = buildUseCase();
    await assignmentRepository.create(assignment);

    const result = await useCase.execute(ctx, { assignmentId: 'assignment-1', novoCargo: '   ' });

    expect(result.ok).toBe(false);
  });

  it('retorna NotFoundError pra atribuição inexistente', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, { assignmentId: 'nao-existe', novoCargo: 'X' });

    expect(result.ok).toBe(false);
  });

  it('lança ForbiddenError sem a permissão boardTerm:manage', async () => {
    const { useCase } = buildUseCase();
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(
      useCase.execute(semPermissao, { assignmentId: 'assignment-1', novoCargo: 'X' }),
    ).rejects.toThrow(ForbiddenError);
  });
});
