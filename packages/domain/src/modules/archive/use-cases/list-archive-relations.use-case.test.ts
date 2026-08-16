import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { InMemoryArchiveRelationRepository } from '../../../test/fakes';
import type { ArchiveRelation } from '../entities/archive-relation.entity';
import { ListArchiveRelationsUseCase } from './list-archive-relations.use-case';

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

describe('ListArchiveRelationsUseCase', () => {
  it('lista todas as relações do tenant', async () => {
    const repo = new InMemoryArchiveRelationRepository();
    await repo.create(makeRelation({ id: 'r1' }));
    await repo.create(makeRelation({ id: 'r2', origemId: 'member-2' }));
    await repo.create(makeRelation({ id: 'r3', tenantId: 't2' }));

    const useCase = new ListArchiveRelationsUseCase({ archiveRelationRepository: repo });
    const result = await useCase.execute(ctx);

    expect(result.map((r) => r.id).sort()).toEqual(['r1', 'r2']);
  });

  it('lança ForbiddenError sem archiveRelation:read', async () => {
    const repo = new InMemoryArchiveRelationRepository();
    const useCase = new ListArchiveRelationsUseCase({ archiveRelationRepository: repo });

    await expect(useCase.execute({ ...ctx, permissions: [] })).rejects.toThrow(ForbiddenError);
  });
});
