import { describe, expect, it } from 'vitest';
import type { AuthContext } from '../../../shared/auth-context';
import { InMemoryArchiveCatalogEntryRepository } from '../../../test/fakes';
import type { ArchiveCatalogEntry } from '../entities/archive-catalog-entry.entity';
import { GetArchiveCatalogEntryByOrigemIdUseCase } from './get-archive-catalog-entry-by-origem-id.use-case';

const ctx: AuthContext = {
  uid: 'membro-1',
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
    contextoHistorico: 'Contexto.',
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

describe('GetArchiveCatalogEntryByOrigemIdUseCase', () => {
  it('retorna a ficha publicada', async () => {
    const repo = new InMemoryArchiveCatalogEntryRepository();
    await repo.create(makeEntry({ publicado: true }));

    const useCase = new GetArchiveCatalogEntryByOrigemIdUseCase({
      archiveCatalogEntryRepository: repo,
    });
    const result = await useCase.execute(ctx, 'file_1');

    expect(result?.id).toBe('entry-1');
  });

  it('retorna null para ficha não publicada, sem distinguir de "nunca catalogado"', async () => {
    const repo = new InMemoryArchiveCatalogEntryRepository();
    await repo.create(makeEntry({ publicado: false }));

    const useCase = new GetArchiveCatalogEntryByOrigemIdUseCase({
      archiveCatalogEntryRepository: repo,
    });

    expect(await useCase.execute(ctx, 'file_1')).toBeNull();
    expect(await useCase.execute(ctx, 'file_nao_existe')).toBeNull();
  });
});
