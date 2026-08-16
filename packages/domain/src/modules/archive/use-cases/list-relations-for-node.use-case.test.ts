import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { InMemoryArchiveRelationRepository } from '../../../test/fakes';
import type { ArchiveRelation } from '../entities/archive-relation.entity';
import { ListRelationsForNodeUseCase } from './list-relations-for-node.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveRelation:read'],
};

function makeRelation(overrides: Partial<ArchiveRelation>): ArchiveRelation {
  return {
    id: 'r1',
    tenantId: 't1',
    origemTipo: 'member',
    origemId: 'member-1',
    destinoTipo: 'boardTerm',
    destinoId: 'term-1',
    tipo: 'participou_de',
    descricao: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'active',
    ativo: true,
    ...overrides,
  };
}

describe('ListRelationsForNodeUseCase', () => {
  it('encontra relações em que o nó é origem ou destino', async () => {
    const repo = new InMemoryArchiveRelationRepository();
    await repo.create(makeRelation({ id: 'r1', origemId: 'member-1' }));
    await repo.create(
      makeRelation({
        id: 'r2',
        origemTipo: 'event',
        origemId: 'event-1',
        destinoTipo: 'member',
        destinoId: 'member-1',
      }),
    );
    await repo.create(makeRelation({ id: 'r3', origemId: 'member-2' }));

    const useCase = new ListRelationsForNodeUseCase({ archiveRelationRepository: repo });
    const result = await useCase.execute(ctx, 'member', 'member-1');

    expect(result.map((r) => r.id).sort()).toEqual(['r1', 'r2']);
  });

  it('lança ForbiddenError sem archiveRelation:read', async () => {
    const repo = new InMemoryArchiveRelationRepository();
    const useCase = new ListRelationsForNodeUseCase({ archiveRelationRepository: repo });

    await expect(
      useCase.execute({ ...ctx, permissions: [] }, 'member', 'member-1'),
    ).rejects.toThrow(ForbiddenError);
  });
});
