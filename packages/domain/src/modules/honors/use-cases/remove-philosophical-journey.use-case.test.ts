import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError, NotFoundError } from '../../../shared/result';
import type { PhilosophicalJourney } from '../entities/philosophical-journey.entity';
import { FixedClock, InMemoryPhilosophicalJourneyRepository } from '../../../test/fakes';
import { RemovePhilosophicalJourneyUseCase } from './remove-philosophical-journey.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['honor:manage'],
};

function buildJourney(overrides: Partial<PhilosophicalJourney> = {}): PhilosophicalJourney {
  return {
    id: 'journey-1',
    tenantId: 't1',
    memberId: 'member-1',
    rito: 'Rito Escocês Antigo e Aceito',
    corpoMaconico: null,
    grau: 'Grau 18',
    instituicao: null,
    data: new Date('2010-01-01'),
    funcoesExercidas: null,
    visivel: false,
    createdAt: new Date('2010-01-01'),
    updatedAt: new Date('2010-01-01'),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

function buildUseCase() {
  const philosophicalJourneyRepository = new InMemoryPhilosophicalJourneyRepository();
  const useCase = new RemovePhilosophicalJourneyUseCase({
    philosophicalJourneyRepository,
    clock: new FixedClock(new Date('2026-01-01T00:00:00Z')),
  });
  return { useCase, philosophicalJourneyRepository };
}

describe('RemovePhilosophicalJourneyUseCase', () => {
  it('marca o registro como excluído (soft delete)', async () => {
    const { useCase, philosophicalJourneyRepository } = buildUseCase();
    await philosophicalJourneyRepository.create(buildJourney());

    const result = await useCase.execute(ctx, 'journey-1');

    expect(result.ok).toBe(true);
    const stored = await philosophicalJourneyRepository.findById('journey-1');
    expect(stored?.deletedAt).not.toBeNull();
  });

  it('devolve NotFoundError quando o registro não existe', async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute(ctx, 'inexistente');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it('lança ForbiddenError quando falta a permissão honor:manage', async () => {
    const { useCase } = buildUseCase();
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao, 'journey-1')).rejects.toThrow(ForbiddenError);
  });
});
