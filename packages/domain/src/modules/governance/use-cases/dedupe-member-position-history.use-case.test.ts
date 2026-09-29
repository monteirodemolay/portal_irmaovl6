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
      gruposMesclados: 0,
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

  it('mescla o mesmo vínculo (Irmão+cargo+Gestão) com datas de início diferentes num só registro contínuo', async () => {
    const positionHistoryRepository = new InMemoryMemberPositionHistoryRepository();
    // Reproduz o achado do Administrador: "Venerável Mestre" duplicado na
    // mesma Gestão — um pedaço já fechado (reenvio do formulário) e o
    // pedaço "em curso" mais recente.
    await positionHistoryRepository.create(
      buildHistory({
        id: 'h1',
        dataInicio: new Date('2026-08-14'),
        dataFim: new Date('2026-09-22'),
      }),
    );
    await positionHistoryRepository.create(
      buildHistory({
        id: 'h2',
        dataInicio: new Date('2026-09-22'),
        dataFim: null,
      }),
    );

    const useCase = new DedupeMemberPositionHistoryUseCase({ positionHistoryRepository });
    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      totalRegistros: 2,
      gruposDuplicados: 0,
      registrosRemovidos: 1,
      gruposMesclados: 1,
    });

    const remaining = await positionHistoryRepository.listByTenant('t1');
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.id).toBe('h1');
    expect(remaining[0]?.dataInicio.toISOString().slice(0, 10)).toBe('2026-08-14');
    // "Em curso" nunca se perde — mesmo o pedaço mais antigo mantido tendo
    // uma `dataFim` própria, o resultado mesclado reflete que ainda está
    // ativo (algum pedaço do grupo tinha `dataFim: null`).
    expect(remaining[0]?.dataFim).toBeNull();
  });

  it('mescla mantendo a data de fim mais recente quando nenhum pedaço está em curso', async () => {
    const positionHistoryRepository = new InMemoryMemberPositionHistoryRepository();
    await positionHistoryRepository.create(
      buildHistory({
        id: 'h1',
        dataInicio: new Date('2018-06-01'),
        dataFim: new Date('2018-12-01'),
      }),
    );
    await positionHistoryRepository.create(
      buildHistory({
        id: 'h2',
        dataInicio: new Date('2018-12-01'),
        dataFim: new Date('2019-05-31'),
      }),
    );

    const useCase = new DedupeMemberPositionHistoryUseCase({ positionHistoryRepository });
    const result = await useCase.execute(ctx);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.gruposMesclados).toBe(1);

    const remaining = await positionHistoryRepository.listByTenant('t1');
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.dataInicio.toISOString().slice(0, 10)).toBe('2018-06-01');
    expect(remaining[0]?.dataFim?.toISOString().slice(0, 10)).toBe('2019-05-31');
  });

  it('recusa sem permissão', async () => {
    const positionHistoryRepository = new InMemoryMemberPositionHistoryRepository();
    const useCase = new DedupeMemberPositionHistoryUseCase({ positionHistoryRepository });
    await expect(useCase.execute(readOnlyCtx)).rejects.toThrow();
  });
});
