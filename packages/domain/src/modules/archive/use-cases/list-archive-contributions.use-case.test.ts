import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { InMemoryArchiveContributionRepository } from '../../../test/fakes';
import type { ArchiveContribution } from '../entities/archive-contribution.entity';
import { ListArchiveContributionsUseCase } from './list-archive-contributions.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveContribution:manage'],
};

function makeContribution(overrides: Partial<ArchiveContribution> = {}): ArchiveContribution {
  return {
    id: 'contrib-1',
    tenantId: 't1',
    memberId: 'member-1',
    titulo: 'Título',
    descricao: 'Descrição',
    tipo: 'memoria',
    arquivoUrl: null,
    tamanhoBytes: null,
    moderacaoStatus: 'pendente',
    motivoRejeicao: null,
    moderadoPor: null,
    moderadoEm: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user-1',
    updatedBy: 'user-1',
    deletedAt: null,
    status: 'draft',
    ativo: true,
    ...overrides,
  };
}

describe('ListArchiveContributionsUseCase', () => {
  it('lista todas as contribuições do tenant', async () => {
    const repo = new InMemoryArchiveContributionRepository();
    await repo.create(makeContribution({ id: 'c1' }));
    await repo.create(makeContribution({ id: 'c2', tenantId: 't2' }));

    const useCase = new ListArchiveContributionsUseCase({ archiveContributionRepository: repo });
    const result = await useCase.execute(ctx);

    expect(result.map((c) => c.id)).toEqual(['c1']);
  });

  it('exige archiveContribution:manage', async () => {
    const repo = new InMemoryArchiveContributionRepository();
    const useCase = new ListArchiveContributionsUseCase({ archiveContributionRepository: repo });

    await expect(useCase.execute({ ...ctx, permissions: [] })).rejects.toThrow();
  });
});
