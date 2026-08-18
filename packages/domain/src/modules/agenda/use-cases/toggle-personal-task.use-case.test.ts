import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { FixedClock, InMemoryPersonalTaskRepository } from '../../../test/fakes';
import type { PersonalTask } from '../entities/personal-task.entity';
import { TogglePersonalTaskUseCase } from './toggle-personal-task.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: [] };
const otherUserCtx: AuthContext = { uid: 'u2', tenantId: 't1', roleId: 'r1', permissions: [] };

const baseTask: PersonalTask = {
  id: 'pt-1',
  tenantId: 't1',
  userId: 'u1',
  titulo: 'Ler trecho indicado (Ritual)',
  concluida: false,
  createdAt: new Date('2026-08-01'),
  updatedAt: new Date('2026-08-01'),
  createdBy: 'u1',
  updatedBy: 'u1',
  deletedAt: null,
  status: 'active',
  ativo: true,
};

function buildUseCase() {
  const personalTaskRepository = new InMemoryPersonalTaskRepository();
  const useCase = new TogglePersonalTaskUseCase({
    personalTaskRepository,
    clock: new FixedClock(new Date('2026-08-10T00:00:00Z')),
  });
  return { useCase, personalTaskRepository };
}

describe('TogglePersonalTaskUseCase', () => {
  it('alterna concluida de false para true', async () => {
    const { useCase, personalTaskRepository } = buildUseCase();
    await personalTaskRepository.create(baseTask);

    const result = await useCase.execute(ctx, 'pt-1');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.concluida).toBe(true);
  });

  it('retorna NotFoundError quando a tarefa é de outro usuário', async () => {
    const { useCase, personalTaskRepository } = buildUseCase();
    await personalTaskRepository.create(baseTask);

    const result = await useCase.execute(otherUserCtx, 'pt-1');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not_found');
  });
});
