import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { InMemoryArchiveCatalogEntryRepository } from '../../../test/fakes';
import type { ArchiveCatalogEntry } from '../entities/archive-catalog-entry.entity';
import { ListArchiveCatalogEntriesUseCase } from './list-archive-catalog-entries.use-case';

const ctx: AuthContext = {
  uid: 'admin-1',
  tenantId: 't1',
  roleId: 'r1',
  permissions: ['archiveCatalog:read'],
};

function makeEntry(overrides: Partial<ArchiveCatalogEntry> = {}): ArchiveCatalogEntry {
  return {
    id: 'entry-1',
    tenantId: 't1',
    origemId: 'file_1',
    tituloCurado: null,
    contextoHistorico: null,
    tags: [],
    publicado: false,
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

describe('ListArchiveCatalogEntriesUseCase', () => {
  it('lista todas as fichas do tenant, publicadas ou não', async () => {
    const repo = new InMemoryArchiveCatalogEntryRepository();
    await repo.create(makeEntry({ id: 'e1', origemId: 'file_1' }));
    await repo.create(makeEntry({ id: 'e2', origemId: 'file_2', publicado: true }));
    await repo.create(makeEntry({ id: 'e3', origemId: 'file_3', tenantId: 't2' }));

    const useCase = new ListArchiveCatalogEntriesUseCase({ archiveCatalogEntryRepository: repo });
    const result = await useCase.execute(ctx);

    expect(result.map((e) => e.id).sort()).toEqual(['e1', 'e2']);
  });
});
