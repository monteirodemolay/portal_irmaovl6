import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import type { PhilosophicalJourney } from '../entities/philosophical-journey.entity';
import { InMemoryPhilosophicalJourneyRepository } from '../../../test/fakes';
import { ListPhilosophicalJourneysUseCase } from './list-philosophical-journeys.use-case';

const ctx: AuthContext = {
  uid: 'member-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['honor:read'],
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

describe('ListPhilosophicalJourneysUseCase', () => {
  it('lista todos os registros do Irmão, visíveis ou não, mais recente primeiro', async () => {
    const philosophicalJourneyRepository = new InMemoryPhilosophicalJourneyRepository();
    await philosophicalJourneyRepository.create(
      buildJourney({ id: 'journey-1', data: new Date('2010-01-01') }),
    );
    await philosophicalJourneyRepository.create(
      buildJourney({
        id: 'journey-2',
        grau: 'Grau 33',
        visivel: true,
        data: new Date('2023-01-01'),
      }),
    );
    await philosophicalJourneyRepository.create(
      buildJourney({ id: 'journey-3', memberId: 'member-2' }),
    );

    const useCase = new ListPhilosophicalJourneysUseCase({ philosophicalJourneyRepository });
    const result = await useCase.execute(ctx, 'member-1');

    expect(result.map((j) => j.id)).toEqual(['journey-2', 'journey-1']);
  });

  it('lança ForbiddenError quando falta a permissão honor:read', async () => {
    const philosophicalJourneyRepository = new InMemoryPhilosophicalJourneyRepository();
    const useCase = new ListPhilosophicalJourneysUseCase({ philosophicalJourneyRepository });
    const semPermissao: AuthContext = { ...ctx, permissions: [] };

    await expect(useCase.execute(semPermissao, 'member-1')).rejects.toThrow(ForbiddenError);
  });
});
