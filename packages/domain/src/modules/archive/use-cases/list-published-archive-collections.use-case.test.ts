import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { InMemoryArchiveCollectionRepository } from '../../../test/fakes';
import type { ArchiveCollection } from '../entities/archive-collection.entity';
import { ListPublishedArchiveCollectionsUseCase } from './list-published-archive-collections.use-case';

const ctx: AuthContext = {
  uid: 'membro-1',
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

describe('ListPublishedArchiveCollectionsUseCase', () => {
  it('lista só coleções publicadas do tenant', async () => {
    const repo = new InMemoryArchiveCollectionRepository();
    await repo.create(makeCollection({ id: 'c1', publicado: false }));
    await repo.create(makeCollection({ id: 'c2', slug: 'colecao-2', publicado: true }));

    const useCase = new ListPublishedArchiveCollectionsUseCase({
      archiveCollectionRepository: repo,
    });
    const result = await useCase.execute(ctx);

    expect(result.map((c) => c.id)).toEqual(['c2']);
  });
});
