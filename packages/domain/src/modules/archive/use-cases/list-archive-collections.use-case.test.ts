import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { ForbiddenError } from '../../../shared/result';
import { InMemoryArchiveCollectionRepository } from '../../../test/fakes';
import type { ArchiveCollection } from '../entities/archive-collection.entity';
import { ListArchiveCollectionsUseCase } from './list-archive-collections.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveCollection:read'],
};

function makeCollection(overrides: Partial<ArchiveCollection>): ArchiveCollection {
  return {
    id: 'c1',
    tenantId: 't1',
    titulo: 'Coleção',
    slug: 'colecao',
    descricaoEditorial: null,
    curadoPor: null,
    capaUrl: null,
    itemIds: [],
    publicado: false,
    ordem: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'admin-1',
    updatedBy: 'admin-1',
    deletedAt: null,
    status: 'draft',
    ativo: true,
    ...overrides,
  };
}

describe('ListArchiveCollectionsUseCase', () => {
  it('lista todas as coleções do tenant, publicadas ou não', async () => {
    const repo = new InMemoryArchiveCollectionRepository();
    await repo.create(makeCollection({ id: 'c1', publicado: false }));
    await repo.create(makeCollection({ id: 'c2', slug: 'colecao-2', publicado: true }));
    await repo.create(makeCollection({ id: 'c3', tenantId: 't2', slug: 'colecao-outro-tenant' }));

    const useCase = new ListArchiveCollectionsUseCase({ archiveCollectionRepository: repo });
    const result = await useCase.execute(ctx);

    expect(result.map((c) => c.id).sort()).toEqual(['c1', 'c2']);
  });

  it('lança ForbiddenError sem archiveCollection:read', async () => {
    const repo = new InMemoryArchiveCollectionRepository();
    const useCase = new ListArchiveCollectionsUseCase({ archiveCollectionRepository: repo });

    await expect(useCase.execute({ ...ctx, permissions: [] })).rejects.toThrow(ForbiddenError);
  });
});
