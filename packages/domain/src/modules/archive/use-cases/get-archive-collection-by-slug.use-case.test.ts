import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { InMemoryArchiveCollectionRepository } from '../../../test/fakes';
import type { ArchiveCollection } from '../entities/archive-collection.entity';
import { GetArchiveCollectionBySlugUseCase } from './get-archive-collection-by-slug.use-case';

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

describe('GetArchiveCollectionBySlugUseCase', () => {
  it('retorna a coleção publicada', async () => {
    const repo = new InMemoryArchiveCollectionRepository();
    await repo.create(makeCollection({ publicado: true }));

    const useCase = new GetArchiveCollectionBySlugUseCase({ archiveCollectionRepository: repo });
    const result = await useCase.execute(ctx, 'colecao');

    expect(result?.id).toBe('c1');
  });

  it('retorna null para coleção não publicada, sem distinguir de "não existe"', async () => {
    const repo = new InMemoryArchiveCollectionRepository();
    await repo.create(makeCollection({ publicado: false }));

    const useCase = new GetArchiveCollectionBySlugUseCase({ archiveCollectionRepository: repo });

    expect(await useCase.execute(ctx, 'colecao')).toBeNull();
    expect(await useCase.execute(ctx, 'nao-existe')).toBeNull();
  });
});
