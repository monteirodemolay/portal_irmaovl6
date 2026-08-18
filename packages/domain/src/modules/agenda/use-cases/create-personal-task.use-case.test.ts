import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import {
  FixedClock,
  InMemoryPersonalTaskRepository,
  SequentialIdGenerator,
} from '../../../test/fakes';
import { CreatePersonalTaskUseCase } from './create-personal-task.use-case';

const ctx: AuthContext = { uid: 'u1', tenantId: 't1', roleId: 'r1', permissions: [] };

function buildUseCase() {
  const personalTaskRepository = new InMemoryPersonalTaskRepository();
  const useCase = new CreatePersonalTaskUseCase({
    personalTaskRepository,
    clock: new FixedClock(new Date('2026-08-10T00:00:00Z')),
    idGenerator: new SequentialIdGenerator(),
  });
  return { useCase, personalTaskRepository };
}

describe('CreatePersonalTaskUseCase', () => {
  it('cria a tarefa como não concluída, pertencente ao usuário', async () => {
    const { useCase, personalTaskRepository } = buildUseCase();

    const result = await useCase.execute(ctx, { titulo: 'Estudar Ritual do Grau Aprendiz' });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.userId).toBe('u1');
    expect(result.value.concluida).toBe(false);
    const stored = await personalTaskRepository.findById(result.value.id);
    expect(stored?.titulo).toBe('Estudar Ritual do Grau Aprendiz');
  });
});
