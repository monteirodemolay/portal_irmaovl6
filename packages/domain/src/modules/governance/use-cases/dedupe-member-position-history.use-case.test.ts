import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { InMemoryMemberPositionHistoryRepository } from '../../../test/fakes';
import type { MemberPositionHistory } from '../../membership/entities/member-position-history.entity';
import { DedupeMemberPositionHistoryUseCase } from './dedupe-member-position-history.use-case';

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
  permissions: ['member:read'],
};

function buildHistory(overrides: Partial<MemberPositionHistory>): MemberPositionHistory {
  return {
    id: 'h1',
    tenantId: 't1',
    memberId: 'member-1',
    cargo: 'veneravel_mestre',
    gestaoId: 'gestao-1',
    dataInicio: new Date('1978-08-19'),
    dataFim: new Date('1979-05-31'),
    observacoes: null,
    createdAt: new Date('2026-09-10T00:00:00Z'),
    updatedAt: new Date('2026-09-10T00:00:00Z'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

describe('DedupeMemberPositionHistoryUseCase', () => {
  it('remove duplicados mantendo o registro mais antigo', async () => {
    const positionHistoryRepository = new InMemoryMemberPositionHistoryRepository();
    await positionHistoryRepository.create(
      buildHistory({ id: 'h1', createdAt: new Date('2026-09-10T10:00:00Z') }),
    );
    await positionHistoryRepository.create(
      buildHistory({ id: 'h2', createdAt: new Date('2026-09-10T10:05:00Z') }),
    );
    await positionHistoryRepository.create(
      buildHistory({ id: 'h3', createdAt: new Date('2026-09-10T10:10:00Z') }),
    );
    // registro diferente (outro cargo) não deve ser tocado
    await positionHistoryRepository.create(buildHistory({ id: 'h4', cargo: 'primeiro_vigilante' }));

    const useCase = new DedupeMemberPositionHistoryUseCase({ positionHistoryRepository });
    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      totalRegistros: 4,
      gruposDuplicados: 1,
      registrosRemovidos: 2,
    });

    const remaining = await positionHistoryRepository.listByTenant('t1');
    expect(remaining).toHaveLength(2);
    expect(remaining.find((h) => h.cargo === 'veneravel_mestre')?.id).toBe('h1');
  });

  it('não remove nada quando não há duplicados', async () => {
    const positionHistoryRepository = new InMemoryMemberPositionHistoryRepository();
    await positionHistoryRepository.create(buildHistory({ id: 'h1' }));
    await positionHistoryRepository.create(buildHistory({ id: 'h2', cargo: 'primeiro_vigilante' }));

    const useCase = new DedupeMemberPositionHistoryUseCase({ positionHistoryRepository });
    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.registrosRemovidos).toBe(0);

    const remaining = await positionHistoryRepository.listByTenant('t1');
    expect(remaining).toHaveLength(2);
  });

  it('recusa sem permissão', async () => {
    const positionHistoryRepository = new InMemoryMemberPositionHistoryRepository();
    const useCase = new DedupeMemberPositionHistoryUseCase({ positionHistoryRepository });
    await expect(useCase.execute(readOnlyCtx)).rejects.toThrow();
  });
});
