import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { InMemoryPersonalTaskRepository } from '../../../test/fakes';
import type { PersonalTask } from '../entities/personal-task.entity';
import { ListMyPersonalTasksUseCase } from './list-my-personal-tasks.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: [] };

function buildTask(overrides: Partial<PersonalTask> = {}): PersonalTask {
  return {
    id: 'pt-1',
    tenantId: 't1',
    userId: 'u1',
    titulo: 'Tarefa',
    concluida: false,
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

describe('ListMyPersonalTasksUseCase', () => {
  it('lista só as tarefas do usuário, pendentes antes de concluídas', async () => {
    const personalTaskRepository = new InMemoryPersonalTaskRepository();
    const useCase = new ListMyPersonalTasksUseCase({ personalTaskRepository });

    await personalTaskRepository.create(
      buildTask({ id: 'pt-1', concluida: true, createdAt: new Date('2026-08-03') }),
    );
    await personalTaskRepository.create(
      buildTask({ id: 'pt-2', concluida: false, createdAt: new Date('2026-08-01') }),
    );
    await personalTaskRepository.create(
      buildTask({ id: 'pt-3', userId: 'u2', createdAt: new Date('2026-08-02') }),
    );

    const result = await useCase.execute(ctx);

    expect(result.map((t) => t.id)).toEqual(['pt-2', 'pt-1']);
  });
});
