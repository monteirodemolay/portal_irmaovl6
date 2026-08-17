import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { InMemoryPersonalEventRepository } from '../../../test/fakes';
import type { PersonalEvent } from '../entities/personal-event.entity';
import { ListMyPersonalEventsUseCase } from './list-my-personal-events.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: [] };

function buildEvent(overrides: Partial<PersonalEvent> = {}): PersonalEvent {
  return {
    id: 'pe-1',
    tenantId: 't1',
    userId: 'u1',
    titulo: 'Dentista',
    descricao: null,
    local: null,
    dataInicio: new Date('2026-08-18T09:00:00Z'),
    dataFim: new Date('2026-08-18T10:00:00Z'),
    lembreteMinutosAntes: null,
    sincronizarComGoogle: false,
    googleEventId: null,
    createdAt: new Date('2026-08-01'),
    updatedAt: new Date('2026-08-01'),
    createdBy: 'u1',
    updatedBy: 'u1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

describe('ListMyPersonalEventsUseCase', () => {
  it('não exige permissão de RBAC — é uma ação pessoal', async () => {
    const repo = new InMemoryPersonalEventRepository();
    const useCase = new ListMyPersonalEventsUseCase({ personalEventRepository: repo });

    const result = await useCase.execute(ctx, {
      from: new Date('2026-08-01'),
      to: new Date('2026-08-31'),
    });

    expect(result).toEqual([]);
  });

  it('lista apenas os compromissos do próprio usuário dentro do intervalo', async () => {
    const repo = new InMemoryPersonalEventRepository();
    await repo.create(buildEvent());
    await repo.create(buildEvent({ id: 'pe-2', userId: 'outro-uid' }));
    await repo.create(buildEvent({ id: 'pe-3', dataInicio: new Date('2026-09-05') }));
    const useCase = new ListMyPersonalEventsUseCase({ personalEventRepository: repo });

    const result = await useCase.execute(ctx, {
      from: new Date('2026-08-01'),
      to: new Date('2026-08-31'),
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('pe-1');
  });
});
